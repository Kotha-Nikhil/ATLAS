use crate::error::AppError;
use crate::models::patient::{CreatePatientRequest, CreateRiskFlagRequest};
use crate::models::lab::CreateLabRequest;
use crate::models::imaging::CreateImagingRequest;
use crate::models::consult::CreateConsultRequest;

const MAX_SHORT_TEXT: usize = 100;
const MAX_LONG_TEXT: usize = 500;

fn check_len(field: &str, value: &str, max: usize) -> Result<(), AppError> {
    if value.trim().is_empty() {
        return Err(AppError::Validation(format!("{} cannot be empty", field)));
    }
    if value.len() > max {
        return Err(AppError::Validation(format!(
            "{} exceeds maximum length of {} characters",
            field, max
        )));
    }
    Ok(())
}

fn check_optional_len(field: &str, value: &Option<String>, max: usize) -> Result<(), AppError> {
    if let Some(v) = value {
        if v.len() > max {
            return Err(AppError::Validation(format!(
                "{} exceeds maximum length of {} characters",
                field, max
            )));
        }
    }
    Ok(())
}

pub fn validate_create_patient(req: &CreatePatientRequest) -> Result<(), AppError> {
    check_len("bed", &req.bed, 10)?;
    check_len("display_name", &req.display_name, MAX_SHORT_TEXT)?;
    check_len("chief_complaint", &req.chief_complaint, MAX_LONG_TEXT)?;
    check_len("sex", &req.sex, 1)?;

    if !["M", "F"].contains(&req.sex.as_str()) {
        return Err(AppError::Validation("sex must be 'M' or 'F'".into()));
    }

    if req.age < 0 || req.age > 150 {
        return Err(AppError::Validation("age must be between 0 and 150".into()));
    }

    if !["1", "2", "3", "4", "5"].contains(&req.esi.as_str()) {
        return Err(AppError::Validation("esi must be 1-5".into()));
    }

    check_optional_len("chief_complaint_icon", &req.chief_complaint_icon, 10)?;
    check_optional_len("milestone_description", &req.milestone_description, MAX_LONG_TEXT)?;
    check_optional_len("ai_assist", &req.ai_assist, MAX_LONG_TEXT)?;

    if let Some(ref owner) = req.owner_role {
        if !["MD", "PA", "RN", "CHG"].contains(&owner.as_str()) {
            return Err(AppError::Validation("owner_role must be MD, PA, RN, or CHG".into()));
        }
    }

    if let Some(ref flags) = req.risk_flags {
        for flag in flags {
            validate_risk_flag(flag)?;
        }
    }

    Ok(())
}

fn validate_risk_flag(flag: &CreateRiskFlagRequest) -> Result<(), AppError> {
    check_len("risk_flag.label", &flag.label, MAX_SHORT_TEXT)?;
    if !["critical", "high", "watch"].contains(&flag.severity.as_str()) {
        return Err(AppError::Validation(
            "risk_flag.severity must be 'critical', 'high', or 'watch'".into(),
        ));
    }
    Ok(())
}

pub fn validate_create_lab(req: &CreateLabRequest) -> Result<(), AppError> {
    check_len("name", &req.name, MAX_SHORT_TEXT)?;
    check_optional_len("alert_threshold", &req.alert_threshold, MAX_SHORT_TEXT)?;
    Ok(())
}

pub fn validate_create_imaging(req: &CreateImagingRequest) -> Result<(), AppError> {
    check_len("imaging_type", &req.imaging_type, MAX_SHORT_TEXT)?;
    if let Some(mins) = req.alert_if_unread_minutes {
        if mins < 1 || mins > 1440 {
            return Err(AppError::Validation(
                "alert_if_unread_minutes must be between 1 and 1440".into(),
            ));
        }
    }
    Ok(())
}

pub fn validate_create_consult(req: &CreateConsultRequest) -> Result<(), AppError> {
    check_len("specialty", &req.specialty, MAX_SHORT_TEXT)?;
    Ok(())
}
