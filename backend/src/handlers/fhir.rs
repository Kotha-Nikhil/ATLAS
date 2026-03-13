use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::patient::Patient;
use crate::state::AppState;


fn patient_to_fhir(p: &Patient) -> Value {
    let esi_num: i32 = match p.esi {
        crate::models::patient::EsiLevel::One => 1,
        crate::models::patient::EsiLevel::Two => 2,
        crate::models::patient::EsiLevel::Three => 3,
        crate::models::patient::EsiLevel::Four => 4,
        crate::models::patient::EsiLevel::Five => 5,
    };

    json!({
        "resourceType": "Patient",
        "id": p.id.to_string(),
        "identifier": [
            {
                "system": "urn:atlas:bed",
                "value": p.bed
            }
        ],
        "name": [
            {
                "use": "anonymous",
                "text": p.display_name
            }
        ],
        "gender": if p.sex == "M" { "male" } else { "female" },
        "extension": [
            {
                "url": "http://atlas.ed/fhir/esi",
                "valueInteger": esi_num
            },
            {
                "url": "http://atlas.ed/fhir/riskScore",
                "valueInteger": p.risk_score
            },
            {
                "url": "http://atlas.ed/fhir/bed",
                "valueString": p.bed
            },
            {
                "url": "http://atlas.ed/fhir/chiefComplaint",
                "valueString": p.chief_complaint
            }
        ]
    })
}

pub async fn get_fhir_patient(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let patient = sqlx::query_as::<_, Patient>("SELECT * FROM patients WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Patient not found".into()))?;

    let fhir = patient_to_fhir(&patient);

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/fhir+json")],
        Json(fhir),
    )
        .into_response())
}

#[derive(Debug, Deserialize)]
pub struct FhirBundleEntry {
    pub resource: Value,
}

#[derive(Debug, Deserialize)]
pub struct FhirBundle {
    #[serde(rename = "resourceType")]
    pub resource_type: String,
    pub entry: Vec<FhirBundleEntry>,
}

pub async fn create_fhir_patient(
    State(state): State<AppState>,
    Json(bundle): Json<FhirBundle>,
) -> Result<Response, AppError> {
    if bundle.resource_type != "Bundle" {
        return Err(AppError::Validation(
            "Expected resourceType 'Bundle'".into(),
        ));
    }

    let patient_entry = bundle
        .entry
        .iter()
        .find(|e| {
            e.resource
                .get("resourceType")
                .and_then(|v| v.as_str())
                == Some("Patient")
        })
        .ok_or_else(|| AppError::Validation("Bundle must contain a Patient resource".into()))?;

    let res = &patient_entry.resource;

    let display_name = res
        .get("name")
        .and_then(|n| n.as_array())
        .and_then(|arr| arr.first())
        .and_then(|n| n.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("?.?.")
        .to_string();

    let gender = res.get("gender").and_then(|g| g.as_str()).unwrap_or("male");
    let sex = if gender == "female" { "F" } else { "M" };

    let extensions = res.get("extension").and_then(|e| e.as_array());

    let bed = extensions
        .and_then(|exts| {
            exts.iter().find(|e| {
                e.get("url").and_then(|u| u.as_str()) == Some("http://atlas.ed/fhir/bed")
            })
        })
        .and_then(|e| e.get("valueString"))
        .and_then(|v| v.as_str())
        .unwrap_or("WR")
        .to_string();

    let age = extensions
        .and_then(|exts| {
            exts.iter().find(|e| {
                e.get("url").and_then(|u| u.as_str()) == Some("http://atlas.ed/fhir/age")
            })
        })
        .and_then(|e| e.get("valueInteger"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;

    let esi = extensions
        .and_then(|exts| {
            exts.iter().find(|e| {
                e.get("url").and_then(|u| u.as_str()) == Some("http://atlas.ed/fhir/esi")
            })
        })
        .and_then(|e| e.get("valueInteger"))
        .and_then(|v| v.as_i64())
        .unwrap_or(3);

    let esi_str = esi.to_string();

    let chief_complaint = extensions
        .and_then(|exts| {
            exts.iter().find(|e| {
                e.get("url").and_then(|u| u.as_str())
                    == Some("http://atlas.ed/fhir/chiefComplaint")
            })
        })
        .and_then(|e| e.get("valueString"))
        .and_then(|v| v.as_str())
        .unwrap_or("FHIR Import")
        .to_string();

    let patient = sqlx::query_as::<_, Patient>(
        r#"INSERT INTO patients (bed, display_name, age, sex, esi, chief_complaint, chief_complaint_icon, disposition_status, owner_role, milestone_description, ai_assist)
        VALUES ($1, $2, $3, $4, $5::esi_level, $6, '🏥', 'active', 'MD', 'FHIR import — assess', 'Imported via FHIR')
        RETURNING *"#,
    )
    .bind(&bed)
    .bind(&display_name)
    .bind(age)
    .bind(sex)
    .bind(&esi_str)
    .bind(&chief_complaint)
    .fetch_one(&state.db)
    .await?;

    let _ = sqlx::query(
        "INSERT INTO audit_log (action, resource, resource_id, details) VALUES ('FHIR_IMPORT', 'Patient', $1, $2)",
    )
    .bind(patient.id)
    .bind(json!({
        "source": "FHIR Bundle",
        "display_name": display_name,
        "bed": bed,
    }))
    .execute(&state.db)
    .await;

    let fhir_response = patient_to_fhir(&patient);

    Ok((
        StatusCode::CREATED,
        [(header::CONTENT_TYPE, "application/fhir+json")],
        Json(fhir_response),
    )
        .into_response())
}

pub async fn capability_statement() -> Response {
    let statement = json!({
        "resourceType": "CapabilityStatement",
        "status": "active",
        "kind": "instance",
        "software": {
            "name": "ATLAS ED Command Center",
            "version": "1.0.0"
        },
        "fhirVersion": "4.0.1",
        "format": ["application/fhir+json"],
        "rest": [{
            "mode": "server",
            "resource": [{
                "type": "Patient",
                "interaction": [
                    {"code": "read"},
                    {"code": "create"}
                ],
                "searchParam": [
                    {
                        "name": "identifier",
                        "type": "token"
                    }
                ]
            }]
        }]
    });

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/fhir+json")],
        Json(statement),
    )
        .into_response()
}
