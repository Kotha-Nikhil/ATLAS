use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    println!("Connected to database. Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    println!("Clearing existing data...");
    sqlx::query("DELETE FROM audit_log").execute(&pool).await.ok();
    sqlx::query("DELETE FROM alerts").execute(&pool).await.ok();
    sqlx::query("DELETE FROM consults").execute(&pool).await.ok();
    sqlx::query("DELETE FROM imaging_orders").execute(&pool).await.ok();
    sqlx::query("DELETE FROM labs").execute(&pool).await.ok();
    sqlx::query("DELETE FROM risk_flags").execute(&pool).await.ok();
    sqlx::query("DELETE FROM patients").execute(&pool).await.ok();
    sqlx::query("DELETE FROM users").execute(&pool).await.ok();

    // --- USERS ---
    println!("Creating users...");
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let hash = argon2.hash_password(b"password123", &salt).unwrap().to_string();

    let md_id = Uuid::new_v4();
    let rn_id = Uuid::new_v4();
    let chg_id = Uuid::new_v4();

    sqlx::query("INSERT INTO users (id, email, name, role, password_hash) VALUES ($1, $2, $3, 'MD', $4)")
        .bind(md_id).bind("dr.chen@atlas.ed").bind("Dr. Chen").bind(&hash)
        .execute(&pool).await.unwrap();

    sqlx::query("INSERT INTO users (id, email, name, role, password_hash) VALUES ($1, $2, $3, 'RN', $4)")
        .bind(rn_id).bind("nurse.k@atlas.ed").bind("Nurse Kim").bind(&hash)
        .execute(&pool).await.unwrap();

    sqlx::query("INSERT INTO users (id, email, name, role, password_hash) VALUES ($1, $2, $3, 'CHG', $4)")
        .bind(chg_id).bind("charge.m@atlas.ed").bind("Charge Martinez").bind(&hash)
        .execute(&pool).await.unwrap();

    println!("Users created: dr.chen@atlas.ed, nurse.k@atlas.ed, charge.m@atlas.ed (password: password123)");

    // --- KEY PATIENTS ---
    println!("Creating patients...");
    let now = Utc::now();

    // Patient 1: R.T. — Bed 4 — Neuro/AMS — STROKE + SEPSIS + ANTICOAG
    let rt_id = insert_patient(&pool, "4", "R.T.", 77, "M", "2", "Neuro / AMS", "🧠",
        true, "MD", "CT head read + lactate #2", now - Duration::minutes(30), true,
        "\"What's pending?\" escalation", 100, now - Duration::hours(3) - Duration::minutes(30)).await;
    insert_flag(&pool, rt_id, "STROKE!", "critical").await;
    insert_flag(&pool, rt_id, "SEPSIS", "critical").await;
    insert_flag(&pool, rt_id, "ANTICOAG", "high").await;
    insert_lab_resulted(&pool, rt_id, "Troponin", "0.01", false, now - Duration::hours(2)).await;
    insert_lab_resulted(&pool, rt_id, "Lactate", "4.2", true, now - Duration::hours(2)).await;
    insert_lab_resulted(&pool, rt_id, "INR", "3.1", true, now - Duration::hours(2)).await;
    insert_lab_resulted(&pool, rt_id, "CBC", "MHC 14.3", true, now - Duration::hours(2)).await;
    insert_imaging(&pool, rt_id, "CT Head", "complete", 30, now - Duration::hours(2) - Duration::minutes(48)).await;
    insert_consult(&pool, rt_id, "Neurology", "called").await;

    // Patient 2: J.S. — Bed 12 — Chest pain/SOB — ACS/PE + AMS RISK
    let js_id = insert_patient(&pool, "12", "J.S.", 62, "M", "2", "Chest pain / SOB", "🫀",
        false, "MD", "Delta trop #2 + EKG repeat", now + Duration::minutes(14), false,
        "Auto-check delta trops", 85, now - Duration::hours(2) - Duration::minutes(30)).await;
    insert_flag(&pool, js_id, "ACS/PE", "critical").await;
    insert_flag(&pool, js_id, "AMS RISK", "high").await;
    insert_lab_pending(&pool, js_id, "Troponin #1", now - Duration::hours(1), Some(">0.04")).await;
    insert_lab_pending(&pool, js_id, "D-Dimer", now - Duration::hours(1), None).await;
    insert_lab_resulted(&pool, js_id, "BMP", "WNL", false, now - Duration::hours(1)).await;
    insert_imaging(&pool, js_id, "CT A/P", "complete", 45, now - Duration::hours(1) - Duration::minutes(45)).await;

    // Patient 3: S.P. — Bed 6 — Syncope — ACS/PE + FALL RISK
    let sp_id = insert_patient(&pool, "6", "S.P.", 72, "F", "2", "Syncope", "💫",
        false, "MD", "Trop #1 + CT Head result", now + Duration::minutes(24), false,
        "Auto-check delta trops", 68, now - Duration::hours(1) - Duration::minutes(12)).await;
    insert_flag(&pool, sp_id, "ACS/PE", "critical").await;
    insert_flag(&pool, sp_id, "FALL RISK", "high").await;
    insert_lab_pending(&pool, sp_id, "Troponin #1", now - Duration::minutes(50), Some(">0.04")).await;
    insert_lab_pending(&pool, sp_id, "BMP", now - Duration::minutes(50), None).await;
    insert_imaging(&pool, sp_id, "CT A/P", "in-scanner", 45, now - Duration::hours(1)).await;
    insert_imaging(&pool, sp_id, "CT Head", "ordered", 30, now - Duration::hours(1)).await;

    // Patient 4: T.N. — Bed 8 — GI bleed — GI BLEED + ANTICOAG
    let tn_id = insert_patient(&pool, "8", "T.N.", 55, "M", "3", "GI bleed", "🩸",
        false, "MD", "Type & screen + GI consult", now + Duration::minutes(9), false,
        "Draft order bundle + timer", 55, now - Duration::hours(1) - Duration::minutes(30)).await;
    insert_flag(&pool, tn_id, "GI BLEED", "critical").await;
    insert_flag(&pool, tn_id, "ANTICOAG", "high").await;
    insert_lab_pending(&pool, tn_id, "CBC", now - Duration::hours(1), None).await;
    insert_lab_pending(&pool, tn_id, "BMP", now - Duration::hours(1), None).await;
    insert_lab_pending(&pool, tn_id, "Type & Screen", now - Duration::hours(1), None).await;
    insert_consult(&pool, tn_id, "GI", "called").await;

    // Patient 5: W.H. — Bed 3 — Fall/hip pain — ANTICOAG + FALL RISK
    let wh_id = insert_patient(&pool, "3", "W.H.", 81, "F", "3", "Fall / hip pain", "🦴",
        false, "MD", "X-Ray hip result + ortho c...", now - Duration::minutes(10), true,
        "\"What's pending?\" escalation", 50, now - Duration::hours(2) - Duration::minutes(12)).await;
    insert_flag(&pool, wh_id, "ANTICOAG", "high").await;
    insert_flag(&pool, wh_id, "FALL RISK", "high").await;
    insert_lab_pending(&pool, wh_id, "CBC", now - Duration::hours(1) - Duration::minutes(30), None).await;
    insert_lab_pending(&pool, wh_id, "BMP", now - Duration::hours(1) - Duration::minutes(30), None).await;
    insert_imaging(&pool, wh_id, "X-Ray Extremity", "complete", 30, now - Duration::hours(2)).await;
    insert_imaging(&pool, wh_id, "CT Head", "complete", 30, now - Duration::minutes(45)).await;
    insert_consult(&pool, wh_id, "Orthopedics", "called").await;

    // --- ADDITIONAL BEDDED PATIENTS ---
    let _mk_id = insert_patient(&pool, "7", "M.K.", 34, "F", "3", "Abd pain / N/V", "🤢",
        false, "PA", "UA, UPT, RUQ US result", now + Duration::minutes(34), false,
        "Draft order bundle + timer", 30, now - Duration::hours(1) - Duration::minutes(30)).await;
    insert_flag(&pool, _mk_id, "ECTOPIC?", "high").await;
    insert_flag(&pool, _mk_id, "G1P0", "watch").await;
    insert_imaging(&pool, _mk_id, "RUQ US", "ordered", 30, now - Duration::minutes(30)).await;

    let _kr_id = insert_patient(&pool, "11", "K.R.", 38, "F", "3", "Migraine / worst HA", "🧠",
        false, "PA", "CT Head result + LP if neg", now + Duration::minutes(19), false,
        "Draft order bundle + timer", 28, now - Duration::hours(1)).await;
    insert_flag(&pool, _kr_id, "SAH R/O", "watch").await;
    insert_imaging(&pool, _kr_id, "CT Head", "complete", 30, now - Duration::minutes(45)).await;

    let _lm_id = insert_patient(&pool, "2", "L.M.", 45, "F", "3", "Flank pain / hematuria", "🩸",
        false, "PA", "CT A/P result + pain reass...", now + Duration::minutes(9), false,
        "Auto-order Toradol PRN", 25, now - Duration::hours(2) - Duration::minutes(1)).await;
    insert_imaging(&pool, _lm_id, "CT A/P", "complete", 45, now - Duration::hours(1) - Duration::minutes(30)).await;

    let _dw_id = insert_patient(&pool, "9", "D.W.", 58, "M", "3", "COPD exacerbation", "🫁",
        false, "MD", "Neb treatment #2 + reassess", now + Duration::minutes(4), false,
        "Draft admission order set", 22, now - Duration::hours(1) - Duration::minutes(40)).await;
    insert_flag(&pool, _dw_id, "COPD HX", "watch").await;

    let _ab_id = insert_patient(&pool, "15", "A.B.", 34, "M", "4", "Laceration repair", "🩹",
        false, "PA", "Lac repair + discharge", now + Duration::minutes(18), false,
        "Procedure note + AVS draft", 8, now - Duration::hours(1) - Duration::minutes(10)).await;
    insert_flag(&pool, _ab_id, "ANTICOAG?", "high").await;

    let _ec_id = insert_patient(&pool, "14", "E.C.", 22, "F", "4", "Ankle sprain", "🦶",
        false, "PA", "X-Ray result + splint + DC", now + Duration::minutes(13), false,
        "Predict fastest dispos", 5, now - Duration::minutes(40)).await;

    // --- WAITING ROOM PATIENTS ---
    for (name, complaint, icon, age, sex) in &[
        ("C.L.", "URI symptoms", "🤧", 50, "M"),
        ("P.G.", "URI / cough", "🤧", 28, "F"),
        ("B.T.", "Low back pain", "🦴", 54, "M"),
        ("A.R.", "Knee injury", "🦵", 42, "M"),
        ("M.V.", "Rash / itching", "🔴", 31, "F"),
        ("H.D.", "Sore throat", "🤒", 19, "F"),
        ("J.P.", "Ear pain", "👂", 8, "M"),
    ] {
        insert_patient(&pool, "WR", name, *age, sex, "4", complaint, icon,
            false, "RN", "Awaiting bed assignment", now + Duration::minutes(30), false,
            "Predict fastest dispos", 5, now - Duration::minutes(30)).await;
    }

    println!("\nSeed complete! {} patients created.", 18);
    println!("Login credentials:");
    println!("  MD:  dr.chen@atlas.ed / password123");
    println!("  RN:  nurse.k@atlas.ed / password123");
    println!("  CHG: charge.m@atlas.ed / password123");
}

async fn insert_patient(
    pool: &sqlx::PgPool, bed: &str, name: &str, age: i32, sex: &str,
    esi: &str, complaint: &str, icon: &str, sepsis_watch: bool,
    owner: &str, milestone_desc: &str, milestone_due: chrono::DateTime<Utc>,
    milestone_overdue: bool, ai_assist: &str, risk_score: i32,
    time_in: chrono::DateTime<Utc>,
) -> Uuid {
    let row: (Uuid,) = sqlx::query_as(
        r#"INSERT INTO patients (bed, display_name, age, sex, esi, chief_complaint, chief_complaint_icon,
           sepsis_watch, owner_role, milestone_description, milestone_due_time, milestone_is_overdue,
           ai_assist, risk_score, time_in)
           VALUES ($1, $2, $3, $4, $5::esi_level, $6, $7, $8, $9::user_role, $10, $11, $12, $13, $14, $15)
           RETURNING id"#,
    )
    .bind(bed).bind(name).bind(age).bind(sex).bind(esi)
    .bind(complaint).bind(icon).bind(sepsis_watch).bind(owner)
    .bind(milestone_desc).bind(milestone_due).bind(milestone_overdue)
    .bind(ai_assist).bind(risk_score).bind(time_in)
    .fetch_one(pool)
    .await
    .unwrap();

    row.0
}

async fn insert_flag(pool: &sqlx::PgPool, patient_id: Uuid, label: &str, severity: &str) {
    sqlx::query("INSERT INTO risk_flags (patient_id, label, severity) VALUES ($1, $2, $3)")
        .bind(patient_id).bind(label).bind(severity)
        .execute(pool).await.unwrap();
}

async fn insert_lab_resulted(
    pool: &sqlx::PgPool, patient_id: Uuid, name: &str, value: &str,
    is_critical: bool, ordered_at: chrono::DateTime<Utc>,
) {
    sqlx::query(
        r#"INSERT INTO labs (patient_id, name, status, ordered_at, resulted_at, value, is_critical)
           VALUES ($1, $2, 'resulted', $3, $4, $5, $6)"#,
    )
    .bind(patient_id).bind(name).bind(ordered_at).bind(Utc::now())
    .bind(value).bind(is_critical)
    .execute(pool).await.unwrap();
}

async fn insert_lab_pending(
    pool: &sqlx::PgPool, patient_id: Uuid, name: &str,
    ordered_at: chrono::DateTime<Utc>, threshold: Option<&str>,
) {
    sqlx::query(
        "INSERT INTO labs (patient_id, name, status, ordered_at, alert_threshold) VALUES ($1, $2, 'ordered', $3, $4)",
    )
    .bind(patient_id).bind(name).bind(ordered_at).bind(threshold)
    .execute(pool).await.unwrap();
}

async fn insert_imaging(
    pool: &sqlx::PgPool, patient_id: Uuid, img_type: &str, status: &str,
    unread_mins: i32, ordered_at: chrono::DateTime<Utc>,
) {
    sqlx::query(
        r#"INSERT INTO imaging_orders (patient_id, imaging_type, status, ordered_at, alert_if_unread_minutes)
           VALUES ($1, $2, $3::imaging_status, $4, $5)"#,
    )
    .bind(patient_id).bind(img_type).bind(status).bind(ordered_at).bind(unread_mins)
    .execute(pool).await.unwrap();
}

async fn insert_consult(pool: &sqlx::PgPool, patient_id: Uuid, specialty: &str, status: &str) {
    sqlx::query(
        "INSERT INTO consults (patient_id, specialty, status) VALUES ($1, $2, $3::consult_status)",
    )
    .bind(patient_id).bind(specialty).bind(status)
    .execute(pool).await.unwrap();
}
