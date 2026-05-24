use chrono::{Local, NaiveDate};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use uuid::Uuid;

const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
const LOG_FILE_NAME: &str = "alertes-taches-log.txt";
static LOG_FILE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

// ─── Data Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub numero: Option<i32>,
    #[serde(rename = "activite")]
    pub activite: String,
    #[serde(rename = "tache")]
    pub tache: String,
    #[serde(rename = "description")]
    pub description: Option<String>,
    pub source: Option<String>,
    pub nature: Option<String>,
    #[serde(rename = "extrantAttendu")]
    pub extrant_attendu: Option<String>,
    pub iov: Option<String>,
    pub responsable: Option<String>,
    #[serde(rename = "dateDebut")]
    pub date_debut: Option<String>,
    #[serde(rename = "dateFin")]
    pub date_fin: Option<String>,
    pub duree: Option<i32>,
    pub priorite: Option<String>,
    #[serde(rename = "etatAvancement")]
    pub etat_avancement: Option<String>,
    #[serde(rename = "extrantsObtenus")]
    pub extrants_obtenus: Option<String>,
    #[serde(rename = "livrablesFournis")]
    pub livrables_fournis: Option<String>,
    pub observations: Option<String>,
    pub etat: Option<String>,
}

impl Task {
    pub fn new() -> Self {
        Task {
            id: Uuid::new_v4().to_string(),
            numero: None,
            activite: String::new(),
            tache: String::new(),
            description: None,
            source: None,
            nature: None,
            extrant_attendu: None,
            iov: None,
            responsable: None,
            date_debut: None,
            date_fin: None,
            duree: None,
            priorite: None,
            etat_avancement: Some("Non démarré".to_string()),
            extrants_obtenus: None,
            livrables_fournis: None,
            observations: None,
            etat: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppData {
    pub tasks: Vec<Task>,
    pub generated_at: String,
    pub version: String,
}

impl Default for AppData {
    fn default() -> Self {
        AppData {
            tasks: Vec::new(),
            generated_at: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
            version: APP_VERSION.to_string(),
        }
    }
}

/// JSON format for import/export (matches the Python app format)
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportPayload {
    pub generated_at: String,
    pub source_file: String,
    pub planificateur: Vec<PlanificateurRow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlanificateurRow {
    #[serde(rename = "N°")]
    pub numero: Option<serde_json::Value>,
    #[serde(rename = "Activité")]
    pub activite: Option<String>,
    #[serde(rename = "Tâche")]
    pub tache: Option<String>,
    #[serde(rename = "Description")]
    pub description: Option<String>,
    #[serde(rename = "Source")]
    pub source: Option<String>,
    #[serde(rename = "Nature")]
    pub nature: Option<String>,
    #[serde(rename = "Extrant attendu")]
    pub extrant_attendu: Option<String>,
    #[serde(rename = "IOV (Indicateur Objectivement Vérifiable)")]
    pub iov: Option<String>,
    #[serde(rename = "Responsable")]
    pub responsable: Option<String>,
    #[serde(rename = "Date de début")]
    pub date_debut: Option<String>,
    #[serde(rename = "Date de fin")]
    pub date_fin: Option<String>,
    #[serde(rename = "Durée (jours)")]
    pub duree: Option<serde_json::Value>,
    #[serde(rename = "Priorité")]
    pub priorite: Option<String>,
    #[serde(rename = "État d'avancement")]
    pub etat_avancement: Option<String>,
    #[serde(rename = "Extrants obtenus à date")]
    pub extrants_obtenus: Option<String>,
    #[serde(rename = "Livrables fournis")]
    pub livrables_fournis: Option<String>,
    #[serde(rename = "Observations")]
    pub observations: Option<String>,
    #[serde(rename = "Etat")]
    pub etat: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Alert {
    pub task: Task,
    pub days_remaining: i64,
    pub color: String,
    pub label: String,
    pub urgency_order: i32,
}

// ─── File Path Helpers ────────────────────────────────────────────────────────

fn get_app_data_path(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().expect("Cannot get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("alertes_taches.json")
}

fn default_log_directory() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(PathBuf::from))
        .or_else(|| std::env::current_dir().ok())
        .unwrap_or_else(std::env::temp_dir)
}

fn fallback_log_directory() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("AlertesTaches")
}

fn log_candidates() -> Vec<PathBuf> {
    let primary = default_log_directory().join(LOG_FILE_NAME);
    let fallback = fallback_log_directory().join(LOG_FILE_NAME);

    if primary == fallback {
        vec![primary]
    } else {
        vec![primary, fallback]
    }
}

fn ensure_log_file(path: &PathBuf) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    OpenOptions::new().create(true).append(true).open(path)?;
    Ok(())
}

fn resolve_log_file_path() -> PathBuf {
    if let Ok(guard) = LOG_FILE_PATH.lock() {
        if let Some(path) = guard.clone() {
            return path;
        }
    }

    let mut chosen_path = None;
    for candidate in log_candidates() {
        if ensure_log_file(&candidate).is_ok() {
            chosen_path = Some(candidate);
            break;
        }
    }

    let chosen_path = chosen_path.unwrap_or_else(|| std::env::temp_dir().join(LOG_FILE_NAME));

    if let Ok(mut guard) = LOG_FILE_PATH.lock() {
        *guard = Some(chosen_path.clone());
    }

    chosen_path
}

fn format_log_line(level: &str, source: &str, message: &str) -> String {
    let sanitized_message = message.replace('\r', " ").replace('\n', " | ");
    format!(
        "[{}] [{}] [{}] {}",
        Local::now().format("%Y-%m-%d %H:%M:%S"),
        level,
        source,
        sanitized_message
    )
}

fn append_app_log(level: &str, source: &str, message: &str) -> std::io::Result<PathBuf> {
    let path = resolve_log_file_path();
    let mut file = OpenOptions::new().create(true).append(true).open(&path)?;
    writeln!(file, "{}", format_log_line(level, source, message))?;
    Ok(path)
}

fn register_panic_logger() {
    let panic_log_path = resolve_log_file_path();
    std::panic::set_hook(Box::new(move |panic_info| {
        let location = panic_info
            .location()
            .map(|location| format!("{}:{}", location.file(), location.line()))
            .unwrap_or_else(|| "unknown".to_string());

        let payload = if let Some(message) = panic_info.payload().downcast_ref::<&str>() {
            (*message).to_string()
        } else if let Some(message) = panic_info.payload().downcast_ref::<String>() {
            message.clone()
        } else {
            "panic without string payload".to_string()
        };

        let _ = ensure_log_file(&panic_log_path);
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&panic_log_path) {
            let _ = writeln!(
                file,
                "{}",
                format_log_line(
                    "ERROR",
                    "panic",
                    &format!("Application panic at {location}: {payload}")
                )
            );
        }
    }));
}

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn load_tasks(app: tauri::AppHandle) -> Result<AppData, String> {
    let path = get_app_data_path(&app);
    if !path.exists() {
        return Ok(AppData::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Lecture impossible : {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("JSON invalide : {}", e))
}

#[tauri::command]
fn save_tasks(app: tauri::AppHandle, tasks: Vec<Task>) -> Result<(), String> {
    let path = get_app_data_path(&app);
    let data = AppData {
        tasks,
        generated_at: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        version: APP_VERSION.to_string(),
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| format!("Sérialisation : {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Écriture impossible : {}", e))
}

#[tauri::command]
fn add_task(app: tauri::AppHandle, mut task: Task) -> Result<Task, String> {
    let mut data = load_tasks(app.clone())?;
    task.id = Uuid::new_v4().to_string();
    // Auto-assign numero
    let max_num = data.tasks.iter().filter_map(|t| t.numero).max().unwrap_or(0);
    if task.numero.is_none() {
        task.numero = Some(max_num + 1);
    }
    // Compute duration
    if task.duree.is_none() {
        if let (Some(debut), Some(fin)) = (&task.date_debut, &task.date_fin) {
            if let (Ok(d), Ok(f)) = (
                NaiveDate::parse_from_str(debut, "%Y-%m-%d"),
                NaiveDate::parse_from_str(fin, "%Y-%m-%d"),
            ) {
                task.duree = Some((f - d).num_days() as i32);
            }
        }
    }
    data.tasks.push(task.clone());
    save_tasks(app, data.tasks)?;
    Ok(task)
}

#[tauri::command]
fn update_task(app: tauri::AppHandle, task: Task) -> Result<Task, String> {
    let mut data = load_tasks(app.clone())?;
    if let Some(existing) = data.tasks.iter_mut().find(|t| t.id == task.id) {
        *existing = task.clone();
        // Recompute duration
        if let (Some(debut), Some(fin)) = (&existing.date_debut, &existing.date_fin) {
            if let (Ok(d), Ok(f)) = (
                NaiveDate::parse_from_str(debut, "%Y-%m-%d"),
                NaiveDate::parse_from_str(fin, "%Y-%m-%d"),
            ) {
                existing.duree = Some((f - d).num_days() as i32);
            }
        }
    }
    save_tasks(app, data.tasks)?;
    Ok(task)
}

#[tauri::command]
fn delete_task(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut data = load_tasks(app.clone())?;
    data.tasks.retain(|t| t.id != id);
    save_tasks(app, data.tasks)
}

#[tauri::command]
fn get_active_alerts(app: tauri::AppHandle) -> Result<Vec<Alert>, String> {
    let data = load_tasks(app)?;
    let today = Local::now().date_naive();
    let mut alerts: Vec<Alert> = Vec::new();

    for task in data.tasks {
        let state = task.etat_avancement.as_deref().unwrap_or("").to_lowercase();
        if state.contains("termin") {
            continue;
        }
        let date_fin = match &task.date_fin {
            Some(d) => match NaiveDate::parse_from_str(d, "%Y-%m-%d") {
                Ok(d) => d,
                Err(_) => continue,
            },
            None => continue,
        };
        let days_remaining = (date_fin - today).num_days();
        let (color, label, urgency_order) = match days_remaining {
            d if d <= 0 => {
                let lbl = if d == 0 {
                    "ÉCHÉANCE AUJOURD'HUI".to_string()
                } else {
                    format!("DÉLAI DÉPASSÉ DE {} JOUR(S)", d.unsigned_abs())
                };
                ("charcoal".to_string(), lbl, 0)
            }
            1 => ("pink".to_string(), "ÉCHÉANCE DEMAIN".to_string(), 1),
            2 => ("yellow".to_string(), "ÉCHÉANCE DANS 2 JOURS".to_string(), 2),
            d if d >= 3 && d <= 7 => (
                "blue".to_string(),
                format!("ÉCHÉANCE DANS {} JOURS", d),
                3,
            ),
            d if d > 7 => (
                "green".to_string(),
                "ÉCHÉANCE DANS PLUS D'UNE SEMAINE".to_string(),
                4,
            ),
            _ => continue,
        };
        alerts.push(Alert {
            task,
            days_remaining,
            color,
            label,
            urgency_order,
        });
    }

    alerts.sort_by_key(|a| (a.urgency_order, a.days_remaining));
    Ok(alerts)
}

#[tauri::command]
fn import_json(content: String) -> Result<Vec<Task>, String> {
    // Try to parse as our internal format first
    if let Ok(data) = serde_json::from_str::<AppData>(&content) {
        return Ok(data.tasks);
    }
    // Try to parse as Python export format
    let payload: ExportPayload = serde_json::from_str(&content)
        .map_err(|e| format!("Format JSON non reconnu : {}", e))?;

    let tasks: Vec<Task> = payload
        .planificateur
        .into_iter()
        .map(|row| Task {
            id: Uuid::new_v4().to_string(),
            numero: row.numero.and_then(|v| match v {
                serde_json::Value::Number(n) => n.as_i64().map(|n| n as i32),
                _ => None,
            }),
            activite: row.activite.unwrap_or_default(),
            tache: row.tache.unwrap_or_default(),
            description: row.description,
            source: row.source,
            nature: row.nature,
            extrant_attendu: row.extrant_attendu,
            iov: row.iov,
            responsable: row.responsable,
            date_debut: row.date_debut,
            date_fin: row.date_fin,
            duree: row.duree.and_then(|v| match v {
                serde_json::Value::Number(n) => n.as_i64().map(|n| n as i32),
                _ => None,
            }),
            priorite: row.priorite,
            etat_avancement: row.etat_avancement,
            extrants_obtenus: row.extrants_obtenus,
            livrables_fournis: row.livrables_fournis,
            observations: row.observations,
            etat: row.etat,
        })
        .collect();

    Ok(tasks)
}

#[tauri::command]
fn export_json(tasks: Vec<Task>) -> Result<String, String> {
    let rows: Vec<PlanificateurRow> = tasks
        .iter()
        .map(|t| PlanificateurRow {
            numero: t.numero.map(|n| serde_json::Value::Number(n.into())),
            activite: Some(t.activite.clone()),
            tache: Some(t.tache.clone()),
            description: t.description.clone(),
            source: t.source.clone(),
            nature: t.nature.clone(),
            extrant_attendu: t.extrant_attendu.clone(),
            iov: t.iov.clone(),
            responsable: t.responsable.clone(),
            date_debut: t.date_debut.clone(),
            date_fin: t.date_fin.clone(),
            duree: t.duree.map(|d| serde_json::Value::Number(d.into())),
            priorite: t.priorite.clone(),
            etat_avancement: t.etat_avancement.clone(),
            extrants_obtenus: t.extrants_obtenus.clone(),
            livrables_fournis: t.livrables_fournis.clone(),
            observations: t.observations.clone(),
            etat: t.etat.clone(),
        })
        .collect();

    let payload = ExportPayload {
        generated_at: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        source_file: "planificateur_taches_gantt_alertes.json".to_string(),
        planificateur: rows,
    };

    serde_json::to_string_pretty(&payload).map_err(|e| format!("Sérialisation : {}", e))
}

#[tauri::command]
fn get_stats(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let data = load_tasks(app.clone())?;
    let today = Local::now().date_naive();
    let total = data.tasks.len();
    let mut completed = 0;
    let mut in_progress = 0;
    let mut not_started = 0;
    let mut overdue = 0;
    let mut due_today = 0;
    let mut due_soon = 0;

    for task in &data.tasks {
        let state = task.etat_avancement.as_deref().unwrap_or("").to_lowercase();
        if state.contains("termin") {
            completed += 1;
        } else if state.contains("cours") {
            in_progress += 1;
        } else {
            not_started += 1;
        }
        if let Some(df) = &task.date_fin {
            if let Ok(date) = NaiveDate::parse_from_str(df, "%Y-%m-%d") {
                let days = (date - today).num_days();
                if days < 0 && !state.contains("termin") {
                    overdue += 1;
                } else if days == 0 && !state.contains("termin") {
                    due_today += 1;
                } else if days > 0 && days <= 7 && !state.contains("termin") {
                    due_soon += 1;
                }
            }
        }
    }

    let alerts = get_active_alerts(app)?;
    Ok(serde_json::json!({
        "total": total,
        "completed": completed,
        "inProgress": in_progress,
        "notStarted": not_started,
        "overdue": overdue,
        "dueToday": due_today,
        "dueSoon": due_soon,
        "alertCount": alerts.len()
    }))
}

#[tauri::command]
fn write_app_log_entry(level: String, source: String, message: String) -> Result<(), String> {
    let normalized_level = if level.trim().is_empty() {
        "INFO"
    } else {
        level.trim()
    };
    let normalized_source = if source.trim().is_empty() {
        "frontend"
    } else {
        source.trim()
    };

    append_app_log(normalized_level, normalized_source, &message)
        .map(|_| ())
        .map_err(|error| format!("Impossible d'ecrire dans le fichier de log : {}", error))
}

// ─── App Setup ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register_panic_logger();

    let primary_log_target = default_log_directory().join(LOG_FILE_NAME);
    let _ = append_app_log(
        "INFO",
        "backend",
        &format!("Desktop app startup requested for version {APP_VERSION}"),
    );
    let _ = append_app_log(
        "INFO",
        "backend",
        &format!("Primary log target: {}", primary_log_target.display()),
    );

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let _ = append_app_log(
                "INFO",
                "backend",
                &format!("Tauri setup reached for version {APP_VERSION}"),
            );
            let _ = append_app_log(
                "INFO",
                "backend",
                &format!("Log file in use: {}", resolve_log_file_path().display()),
            );
            let _ = append_app_log(
                "INFO",
                "backend",
                &format!("Data file path: {}", get_app_data_path(&app.handle().clone()).display()),
            );
            let _ = append_app_log(
                "INFO",
                "backend",
                &format!("Main window available: {}", app.get_webview_window("main").is_some()),
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_tasks,
            save_tasks,
            add_task,
            update_task,
            delete_task,
            get_active_alerts,
            import_json,
            export_json,
            get_stats,
            write_app_log_entry,
        ]);
    let _ = append_app_log("INFO", "backend", "Starting Tauri event loop");
    if let Err(error) = builder.run(tauri::generate_context!()) {
        let _ = append_app_log(
            "ERROR",
            "backend",
            &format!("Tauri startup failed: {}", error),
        );
        panic!("Erreur au demarrage de Tauri: {}", error);
    }

    let _ = append_app_log("INFO", "backend", "Tauri event loop exited cleanly");
}
