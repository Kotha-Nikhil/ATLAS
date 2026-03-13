"""
ATLAS FHIR R4 Converter

Converts ParsedPatient data into FHIR R4-compliant Bundle resources
containing Patient and Encounter entries.

Compliant with: HL7 FHIR R4 (4.0.1)
"""

from typing import Any

from hl7_parser import ParsedPatient


def to_fhir_patient(patient: ParsedPatient) -> dict[str, Any]:
    """
    Build a FHIR R4 Patient resource.
    HIPAA: name uses 'anonymous' use — only initials stored.
    """
    resource: dict[str, Any] = {
        "resourceType": "Patient",
        "id": patient.mrn,
        "identifier": [
            {
                "system": "urn:bch:mrn",
                "value": patient.mrn,
            }
        ],
        "name": [
            {
                "use": "anonymous",
                "text": patient.display_name,
            }
        ],
        "gender": "male" if patient.sex == "M" else "female",
        "extension": [
            {
                "url": "http://atlas.ed/fhir/bed",
                "valueString": patient.bed,
            }
        ],
    }

    if patient.age > 0:
        resource["extension"].append(
            {
                "url": "http://atlas.ed/fhir/age",
                "valueInteger": patient.age,
            }
        )

    return resource


def to_fhir_encounter(patient: ParsedPatient) -> dict[str, Any]:
    """
    Build a FHIR R4 Encounter resource for an ED visit.
    """
    status = "finished" if patient.event_type == "discharge" else "in-progress"

    period: dict[str, str] = {"start": patient.admit_time.isoformat()}
    if patient.discharge_time:
        period["end"] = patient.discharge_time.isoformat()

    return {
        "resourceType": "Encounter",
        "status": status,
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "EMER",
            "display": "Emergency",
        },
        "period": period,
        "location": [
            {
                "location": {
                    "display": f"Bed {patient.bed}",
                }
            }
        ],
        "participant": [
            {
                "individual": {
                    "display": patient.attending,
                }
            }
        ],
    }


def to_fhir_bundle(patient: ParsedPatient) -> dict[str, Any]:
    """
    Convert a ParsedPatient to a FHIR R4 Bundle (transaction type).

    Contains:
      - Patient resource (demographics, bed, identifiers)
      - Encounter resource (ED visit, attending, period)

    Compliant with FHIR R4 Bundle specification.
    """
    patient_resource = to_fhir_patient(patient)
    encounter_resource = to_fhir_encounter(patient)

    return {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": patient_resource,
                "request": {
                    "method": "POST",
                    "url": "Patient",
                },
            },
            {
                "resource": encounter_resource,
                "request": {
                    "method": "POST",
                    "url": "Encounter",
                },
            },
        ],
    }
