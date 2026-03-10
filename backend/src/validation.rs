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

pub fn validate_login_request(email: &str, password: &str) -> Result<(), AppError> {
    if email.trim().is_empty() {
        return Err(AppError::Validation("email cannot be empty".into()));
    }
    if email.len() > 254 {
        return Err(AppError::Validation("email is too long".into()));
    }
    if !email.contains('@') {
        return Err(AppError::Validation("email must contain @".into()));
    }
    if password.is_empty() {
        return Err(AppError::Validation("password cannot be empty".into()));
    }
    if password.len() > 128 {
        return Err(AppError::Validation("password is too long".into()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::patient::CreatePatientRequest;
    use crate::models::lab::CreateLabRequest;
    use crate::models::imaging::CreateImagingRequest;
    use crate::models::consult::CreateConsultRequest;

    fn valid_patient_request() -> CreatePatientRequest {
        CreatePatientRequest {
            bed: "4".into(),
            display_name: "R.T.".into(),
            age: 77,
            sex: "M".into(),
            esi: "2".into(),
            chief_complaint: "Neuro / AMS".into(),
            chief_complaint_icon: None,
            sepsis_watch: None,
            owner_role: None,
            milestone_description: None,
            milestone_due_time: None,
            ai_assist: None,
            risk_flags: None,
        }
    }

    #[test]
    fn test_valid_patient() {
        assert!(validate_create_patient(&valid_patient_request()).is_ok());
    }

    #[test]
    fn test_empty_bed() {
        let mut req = valid_patient_request();
        req.bed = "".into();
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_bed_too_long() {
        let mut req = valid_patient_request();
        req.bed = "a".repeat(11);
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_invalid_sex() {
        let mut req = valid_patient_request();
        req.sex = "X".into();
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_age_negative() {
        let mut req = valid_patient_request();
        req.age = -1;
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_age_too_high() {
        let mut req = valid_patient_request();
        req.age = 200;
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_invalid_esi() {
        let mut req = valid_patient_request();
        req.esi = "6".into();
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_invalid_owner_role() {
        let mut req = valid_patient_request();
        req.owner_role = Some("INTERN".into());
        assert!(validate_create_patient(&req).is_err());
    }

    #[test]
    fn test_valid_lab() {
        let req = CreateLabRequest {
            name: "BMP".into(),
            alert_threshold: None,
        };
        assert!(validate_create_lab(&req).is_ok());
    }

    #[test]
    fn test_empty_lab_name() {
        let req = CreateLabRequest {
            name: "".into(),
            alert_threshold: None,
        };
        assert!(validate_create_lab(&req).is_err());
    }

    #[test]
    fn test_valid_imaging() {
        let req = CreateImagingRequest {
            imaging_type: "X-Ray Chest".into(),
            alert_if_unread_minutes: Some(30),
        };
        assert!(validate_create_imaging(&req).is_ok());
    }

    #[test]
    fn test_imaging_minutes_out_of_range() {
        let req = CreateImagingRequest {
            imaging_type: "CT Head".into(),
            alert_if_unread_minutes: Some(2000),
        };
        assert!(validate_create_imaging(&req).is_err());
    }

    #[test]
    fn test_valid_consult() {
        let req = CreateConsultRequest {
            specialty: "Cardiology".into(),
        };
        assert!(validate_create_consult(&req).is_ok());
    }

    #[test]
    fn test_empty_consult() {
        let req = CreateConsultRequest {
            specialty: "".into(),
        };
        assert!(validate_create_consult(&req).is_err());
    }

    #[test]
    fn test_valid_login() {
        assert!(validate_login_request("user@test.com", "password").is_ok());
    }

    #[test]
    fn test_login_empty_email() {
        assert!(validate_login_request("", "password").is_err());
    }

    #[test]
    fn test_login_no_at_sign() {
        assert!(validate_login_request("usertest.com", "password").is_err());
    }

    #[test]
    fn test_login_empty_password() {
        assert!(validate_login_request("user@test.com", "").is_err());
    }
}
