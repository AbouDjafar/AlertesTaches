use chrono::{Local, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, State, WebviewUrl, WebviewWindowBuilder,
};
use uuid::Uuid;

const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
const LOG_FILE_NAME: &str = "alertes-taches-log.txt";
const SETTINGS_FILE_NAME: &str = "alertes_taches_settings.json";
const PYTHON_JSON_FILE_NAME: &str = "planificateur_taches_gantt_alertes.json";
const STARTUP_SHORTCUT_NAME: &str = "LANCER_ALERTES_DESKTOP.lnk";
const NOTE_WIDTH: f64 = 360.0;
const NOTE_HEIGHT: f64 = 250.0;
const NOTE_MIN_HEIGHT: f64 = 220.0;
const NOTE_MARGIN: f64 = 28.0;
const NOTE_OFFSET_Y: f64 = 34.0;
const NOTE_OFFSET_X: f64 = 46.0;

static LOG_FILE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);
static SETTINGS_CACHE: Mutex<AppSettings> = Mutex::new(AppSettings {
    verbose_logs: false,
    launch_sticky_notes_on_startup: false,
});

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
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
    fn with_new_id(mut self) -> Self {
        self.id = Uuid::new_v4().to_string();
        self
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub tasks: Vec<Task>,
    pub generated_at: String,
    pub version: String,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            tasks: Vec::new(),
            generated_at: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
            version: APP_VERSION.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub verbose_logs: bool,
    pub launch_sticky_notes_on_startup: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            verbose_logs: false,
            launch_sticky_notes_on_startup: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportPayload {
    pub generated_at: String,
    pub source_file: String,
    pub planificateur: Vec<PlanificateurRow>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gantt: Option<Vec<GanttRow>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlanificateurRow {
    #[serde(rename = "N°", alias = "NÂ°")]
    pub numero: Option<serde_json::Value>,
    #[serde(rename = "Activité", alias = "ActivitÃ©")]
    pub activite: Option<String>,
    #[serde(rename = "Tâche", alias = "TÃ¢che")]
    pub tache: Option<String>,
    #[serde(rename = "Description")]
    pub description: Option<String>,
    #[serde(rename = "Source")]
    pub source: Option<String>,
    #[serde(rename = "Nature")]
    pub nature: Option<String>,
    #[serde(rename = "Extrant attendu")]
    pub extrant_attendu: Option<String>,
    #[serde(
        rename = "IOV (Indicateur Objectivement Vérifiable)",
        alias = "IOV (Indicateur Objectivement VÃ©rifiable)"
    )]
    pub iov: Option<String>,
    #[serde(rename = "Responsable")]
    pub responsable: Option<String>,
    #[serde(rename = "Date de début", alias = "Date de dÃ©but")]
    pub date_debut: Option<String>,
    #[serde(rename = "Date de fin")]
    pub date_fin: Option<String>,
    #[serde(rename = "Durée (jours)", alias = "DurÃ©e (jours)")]
    pub duree: Option<serde_json::Value>,
    #[serde(rename = "Priorité", alias = "PrioritÃ©")]
    pub priorite: Option<String>,
    #[serde(
        rename = "État d'avancement",
        alias = "Ã‰tat d'avancement",
        alias = "État d’avancement",
        alias = "Etat d'avancement",
        alias = "Etat d’avancement",
        alias = "Ã‰tat dâ€™avancement",
        alias = "Ã‰tat d’avancement",
        alias = "Ã‰tat dâ€™avancement",
        alias = "Ã‰tat d'avancement"
    )]
    pub etat_avancement: Option<String>,
    #[serde(
        rename = "Extrants obtenus à date",
        alias = "Extrants obtenus Ã  date"
    )]
    pub extrants_obtenus: Option<String>,
    #[serde(rename = "Livrables fournis")]
    pub livrables_fournis: Option<String>,
    #[serde(rename = "Observations")]
    pub observations: Option<String>,
    #[serde(rename = "Etat")]
    pub etat: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GanttRow {
    #[serde(rename = "Tâche", alias = "TÃ¢che")]
    pub tache: String,
    #[serde(rename = "Date de début", alias = "Date de dÃ©but")]
    pub date_debut: Option<String>,
    #[serde(rename = "Durée (jours)", alias = "DurÃ©e (jours)")]
    pub duree: Option<i32>,
    #[serde(
        rename = "État d'avancement",
        alias = "Ã‰tat d'avancement",
        alias = "État d’avancement",
        alias = "Etat d'avancement",
        alias = "Etat d’avancement",
        alias = "Ã‰tat dâ€™avancement",
        alias = "Ã‰tat d’avancement",
        alias = "Ã‰tat dâ€™avancement",
        alias = "Ã‰tat d'avancement"
    )]
    pub etat_avancement: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub task: Task,
    pub days_remaining: i64,
    pub color: String,
    pub label: String,
    pub urgency_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StickyNotePayload {
    pub label: String,
    pub color: String,
    pub tache: String,
    pub description: String,
    pub responsable: String,
    pub date_fin: String,
    pub show_close_all: bool,
    pub order: usize,
    pub window_height: f64,
}

#[derive(Default)]
struct RuntimeState {
    sticky_notes: Mutex<HashMap<String, StickyNotePayload>>,
    sticky_mode: bool,
}

const PUSH_TO_PHONE_SCRIPT: &str = r#"
param(
  [Parameter(Mandatory = $true)][string]$LocalJsonPath,
  [Parameter(Mandatory = $true)][string]$TargetFolderName,
  [Parameter(Mandatory = $true)][string]$FileName
)

function Normalize-Name {
    param([string]$Name)
    if ($null -eq $Name) { return "" }
    return ($Name.Trim().ToLowerInvariant())
}

function Normalize-Stem {
    param([string]$Name)
    $normalized = Normalize-Name $Name
    if ($normalized.EndsWith(".json")) {
        return $normalized.Substring(0, $normalized.Length - 5)
    }
    return $normalized
}

function Find-ShellItemByName {
    param($Folder, [string]$ExpectedName)
    $expected = Normalize-Name $ExpectedName
    $expectedStem = Normalize-Stem $ExpectedName
    foreach ($item in $Folder.Items()) {
        $itemName = Normalize-Name $item.Name
        if ($itemName -eq $expected -or (Normalize-Stem $item.Name) -eq $expectedStem) {
            return $item
        }
    }
    foreach ($item in $Folder.Items()) {
        $itemName = Normalize-Name $item.Name
        if ($itemName -like "*$expected*" -or (Normalize-Stem $item.Name) -like "*$expectedStem*") {
            return $item
        }
    }
    return $null
}

function Detect-Phone {
    $shell = New-Object -ComObject Shell.Application
    $myComputer = $shell.Namespace(17)
    foreach ($item in $myComputer.Items()) {
        if ($item.IsFolder) {
            $folder = $item.GetFolder
            foreach ($sub in $folder.Items()) {
                if ($sub.Name -match "Internal|Stockage interne") {
                    return $item.GetFolder
                }
            }
        }
    }
    return $null
}

if (-not (Test-Path $LocalJsonPath)) {
    Write-Host "[ERREUR] Fichier JSON introuvable : $LocalJsonPath"
    exit 1
}

Write-Host ">>> ETAPE 1 : Recherche du telephone Android"
$phone = $null
for ($attempt = 0; $attempt -lt 60 -and -not $phone; $attempt++) {
    Start-Sleep -Milliseconds 500
    $phone = Detect-Phone
}
if (-not $phone) {
    Write-Host "[ERREUR] Aucun telephone Android detecte apres 30 secondes."
    exit 1
}
Write-Host "[OK] Telephone detecte."

$internalStorage = @($phone.Items() | Where-Object { $_.Name -match "Internal|Stockage interne" }) | Select-Object -First 1
if (-not $internalStorage) {
    Write-Host "[ERREUR] Stockage interne introuvable."
    exit 1
}

$internalFolder = $internalStorage.GetFolder
$targetFolder = Find-ShellItemByName -Folder $internalFolder -ExpectedName $TargetFolderName
if (-not $targetFolder) {
    $internalFolder.NewFolder($TargetFolderName)
    Start-Sleep -Seconds 2
    $targetFolder = Find-ShellItemByName -Folder $internalFolder -ExpectedName $TargetFolderName
}
if (-not $targetFolder) {
    Write-Host "[ERREUR] Impossible de creer le dossier cible."
    exit 1
}

$destination = $targetFolder.GetFolder
if (-not $destination) {
    Write-Host "[ERREUR] Impossible d'acceder au dossier cible sur le telephone."
    exit 1
}

$existingFile = Find-ShellItemByName -Folder $destination -ExpectedName $FileName
if ($existingFile) {
    $shellDel = New-Object -ComObject Shell.Application
    $shellDel.Namespace(10).MoveHere($existingFile, 0x0014)
    Start-Sleep -Seconds 2
}

$shellSrc = New-Object -ComObject Shell.Application
$srcFolder = $shellSrc.Namespace([System.IO.Path]::GetDirectoryName($LocalJsonPath))
$srcFile = $srcFolder.ParseName($FileName)
if (-not $srcFile) {
    Write-Host "[ERREUR] Fichier JSON introuvable pour la copie."
    exit 1
}

Write-Host ">>> ETAPE 2 : Copie vers le telephone"
$destination.CopyHere($srcFile, 4)
$timeout = 60
for ($elapsed = 0; $elapsed -lt $timeout; $elapsed++) {
    $check = Find-ShellItemByName -Folder $destination -ExpectedName $FileName
    if ($check) {
        Write-Host "[OK] Fichier copie avec succes sur le telephone : $($check.Name)"
        exit 0
    }
    Start-Sleep -Seconds 1
}

Write-Host "[ERREUR] Timeout pendant la copie vers le telephone."
exit 1
"#;

const PULL_FROM_PHONE_SCRIPT: &str = r#"
param(
  [Parameter(Mandatory = $true)][string]$OutputJsonPath,
  [Parameter(Mandatory = $true)][string]$TargetFolderName,
  [Parameter(Mandatory = $true)][string]$FileName
)

function Normalize-Name {
    param([string]$Name)
    if ($null -eq $Name) { return "" }
    return ($Name.Trim().ToLowerInvariant())
}

function Normalize-Stem {
    param([string]$Name)
    $normalized = Normalize-Name $Name
    if ($normalized.EndsWith(".json")) {
        return $normalized.Substring(0, $normalized.Length - 5)
    }
    return $normalized
}

function Detect-Phone {
    $shell = New-Object -ComObject Shell.Application
    $myComputer = $shell.Namespace(17)
    foreach ($item in $myComputer.Items()) {
        if ($item.IsFolder) {
            $folder = $item.GetFolder
            foreach ($sub in $folder.Items()) {
                if ($sub.Name -match "Internal|Stockage interne") {
                    return $item.GetFolder
                }
            }
        }
    }
    return $null
}

function Find-ShellItemByName {
    param($Folder, [string]$ExpectedName)
    $expected = Normalize-Name $ExpectedName
    $expectedStem = Normalize-Stem $ExpectedName
    foreach ($item in $Folder.Items()) {
        if ((Normalize-Name $item.Name) -eq $expected -or (Normalize-Stem $item.Name) -eq $expectedStem) {
            return $item
        }
    }
    foreach ($item in $Folder.Items()) {
        if ((Normalize-Name $item.Name) -like "*$expected*" -or (Normalize-Stem $item.Name) -like "*$expectedStem*") {
            return $item
        }
    }
    return $null
}

Write-Host ">>> ETAPE 1 : Recherche du telephone Android"
$phone = $null
for ($attempt = 0; $attempt -lt 60 -and -not $phone; $attempt++) {
    Start-Sleep -Milliseconds 500
    $phone = Detect-Phone
}
if (-not $phone) {
    Write-Host "[ERREUR] Aucun telephone Android detecte apres 30 secondes."
    exit 1
}
Write-Host "[OK] Telephone detecte."

$internalStorage = @($phone.Items() | Where-Object { $_.Name -match "Internal|Stockage interne" }) | Select-Object -First 1
if (-not $internalStorage) {
    Write-Host "[ERREUR] Stockage interne introuvable."
    exit 1
}

$internalFolder = $internalStorage.GetFolder
$targetFolder = $null
for ($attempt = 0; $attempt -lt 10 -and -not $targetFolder; $attempt++) {
    $targetFolder = Find-ShellItemByName -Folder $internalFolder -ExpectedName $TargetFolderName
    if (-not $targetFolder) { Start-Sleep -Seconds 1 }
}
if (-not $targetFolder) {
    Write-Host "[ERREUR] Dossier '$TargetFolderName' introuvable sur le telephone."
    exit 1
}

$sourceShellFolder = $targetFolder.GetFolder
if (-not $sourceShellFolder) {
    Write-Host "[ERREUR] Impossible d'acceder au dossier '$TargetFolderName' sur le telephone."
    exit 1
}

$jsonOnPhone = $null
for ($attempt = 0; $attempt -lt 15 -and -not $jsonOnPhone; $attempt++) {
    $jsonOnPhone = Find-ShellItemByName -Folder $sourceShellFolder -ExpectedName $FileName
    if (-not $jsonOnPhone) { Start-Sleep -Seconds 1 }
}
if (-not $jsonOnPhone) {
    Write-Host "[ERREUR] Fichier '$FileName' introuvable sur le telephone."
    exit 1
}

if (Test-Path $OutputJsonPath) {
    Remove-Item $OutputJsonPath -Force
}

Write-Host ">>> ETAPE 2 : Copie du JSON vers le PC"
$localDir = [System.IO.Path]::GetDirectoryName($OutputJsonPath)
$shellDest = New-Object -ComObject Shell.Application
$localShell = $shellDest.Namespace($localDir)
if (-not $localShell) {
    Write-Host "[ERREUR] Impossible d'acceder au dossier local."
    exit 1
}

$localShell.CopyHere($jsonOnPhone, 4)
$timeout = 60
for ($elapsed = 0; $elapsed -lt $timeout; $elapsed++) {
    if (Test-Path $OutputJsonPath) {
        Write-Host "[OK] JSON recupere : $OutputJsonPath"
        exit 0
    }
    Start-Sleep -Seconds 1
}

Write-Host "[ERREUR] Timeout pendant la copie depuis le telephone."
exit 1
"#;

fn get_app_data_path(app: &AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().expect("Cannot get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("alertes_taches.json")
}

fn get_settings_path(app: &AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().expect("Cannot get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join(SETTINGS_FILE_NAME)
}

fn get_exports_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let documents_dir = app
        .path()
        .document_dir()
        .map_err(|error| format!("Unable to resolve Documents directory: {}", error))?;
    let exports_dir = documents_dir.join("Exports Alertes Taches");
    fs::create_dir_all(&exports_dir)
        .map_err(|error| format!("Unable to create exports directory: {}", error))?;
    Ok(exports_dir)
}

fn open_directory_in_explorer(path: &PathBuf) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        Command::new("explorer.exe")
            .arg(path)
            .spawn()
            .map_err(|error| format!("Unable to open Explorer: {}", error))?;
    }

    Ok(())
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

#[derive(Clone, Copy, PartialEq, Eq)]
enum LogLevel {
    Error,
    Warn,
    Info,
}

fn parse_log_level(level: &str) -> LogLevel {
    match level.trim().to_uppercase().as_str() {
        "ERROR" => LogLevel::Error,
        "WARN" | "WARNING" => LogLevel::Warn,
        _ => LogLevel::Info,
    }
}

fn should_write_log(level: LogLevel) -> bool {
    if level == LogLevel::Error {
        return true;
    }

    SETTINGS_CACHE
        .lock()
        .map(|settings| settings.verbose_logs)
        .unwrap_or(false)
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

fn append_app_log(level: &str, source: &str, message: &str) -> std::io::Result<Option<PathBuf>> {
    let parsed_level = parse_log_level(level);
    if !should_write_log(parsed_level) {
        return Ok(None);
    }

    let path = resolve_log_file_path();
    let mut file = OpenOptions::new().create(true).append(true).open(&path)?;
    writeln!(file, "{}", format_log_line(level, source, message))?;
    Ok(Some(path))
}

fn load_settings_from_disk(app: &AppHandle) -> AppSettings {
    let path = get_settings_path(app);
    let mut settings = fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<AppSettings>(&content).ok())
        .unwrap_or_default();
    settings.launch_sticky_notes_on_startup = get_startup_shortcut_path().exists();
    settings
}

fn store_settings_in_cache(settings: &AppSettings) {
    if let Ok(mut guard) = SETTINGS_CACHE.lock() {
        *guard = settings.clone();
    }
}

fn save_settings_to_disk(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path(app);
    let content = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Serialization settings failed: {}", error))?;
    fs::write(path, content).map_err(|error| format!("Unable to write settings: {}", error))
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

fn read_app_data(app: &AppHandle) -> Result<AppData, String> {
    let path = get_app_data_path(app);
    if !path.exists() {
        return Ok(AppData::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Lecture impossible : {}", e))?;
    let data: AppData = serde_json::from_str(&content).map_err(|e| format!("JSON invalide : {}", e))?;
    let AppData {
        tasks,
        generated_at,
        version,
    } = data;
    Ok(AppData {
        tasks: tasks
            .into_iter()
            .enumerate()
            .map(|(index, task)| normalize_task(task, index as i32 + 1))
            .collect(),
        generated_at,
        version,
    })
}

fn write_app_data(app: &AppHandle, tasks: Vec<Task>) -> Result<AppData, String> {
    let path = get_app_data_path(app);
    let data = AppData {
        tasks: tasks
            .into_iter()
            .enumerate()
            .map(|(index, task)| normalize_task(task, index as i32 + 1))
            .collect(),
        generated_at: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        version: APP_VERSION.to_string(),
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| format!("Serialization failed: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Unable to write data: {}", e))?;
    Ok(data)
}

fn task_duration(task: &Task) -> Option<i32> {
    let start = task
        .date_debut
        .as_deref()
        .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok());
    let end = task
        .date_fin
        .as_deref()
        .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok());
    match (start, end) {
        (Some(start), Some(end)) => Some((end - start).num_days() as i32),
        _ => task.duree,
    }
}

fn normalize_text(value: String) -> String {
    value.trim().to_string()
}

fn normalize_option_text(value: Option<String>) -> Option<String> {
    Some(value.unwrap_or_default().trim().to_string())
}

fn normalize_task(mut task: Task, next_numero: i32) -> Task {
    if task.id.trim().is_empty() {
        task.id = Uuid::new_v4().to_string();
    }
    if task.numero.is_none() {
        task.numero = Some(next_numero);
    }
    task.activite = normalize_text(task.activite);
    task.tache = normalize_text(task.tache);
    task.description = normalize_option_text(task.description);
    task.source = normalize_option_text(task.source);
    task.nature = normalize_option_text(task.nature);
    task.extrant_attendu = normalize_option_text(task.extrant_attendu);
    task.iov = normalize_option_text(task.iov);
    task.responsable = normalize_option_text(task.responsable);
    task.date_debut = normalize_option_text(task.date_debut);
    task.date_fin = normalize_option_text(task.date_fin);
    task.priorite = normalize_option_text(task.priorite);
    task.etat_avancement = Some(
        task.etat_avancement
            .unwrap_or_else(|| "Non démarré".to_string())
            .trim()
            .to_string(),
    );
    if task
        .etat_avancement
        .as_deref()
        .is_some_and(|value| value.is_empty())
    {
        task.etat_avancement = Some("Non démarré".to_string());
    }
    task.extrants_obtenus = normalize_option_text(task.extrants_obtenus);
    task.livrables_fournis = normalize_option_text(task.livrables_fournis);
    task.observations = normalize_option_text(task.observations);
    task.etat = task
        .etat
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    task.duree = task_duration(&task);
    task
}

fn build_active_alerts(tasks: &[Task]) -> Vec<Alert> {
    let today = Local::now().date_naive();
    let mut alerts = Vec::new();

    for task in tasks.iter().cloned() {
        let state = task.etat_avancement.as_deref().unwrap_or("").to_lowercase();
        if state.contains("termin") {
            continue;
        }

        let Some(date_fin) = task
            .date_fin
            .as_deref()
            .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
        else {
            continue;
        };

        let days_remaining = (date_fin - today).num_days();
        let (color, label, urgency_order) = match days_remaining {
            d if d <= 0 => {
                let label = if d == 0 {
                    "ECHEANCE AUJOURD'HUI".to_string()
                } else {
                    format!("DELAI DEPASSE DE {} JOUR(S)", d.unsigned_abs())
                };
                ("charcoal".to_string(), label, 0)
            }
            1 => ("pink".to_string(), "ECHEANCE DEMAIN".to_string(), 1),
            2 => ("yellow".to_string(), "ECHEANCE DANS 2 JOURS".to_string(), 2),
            d if (3..=7).contains(&d) => (
                "blue".to_string(),
                format!("ECHEANCE DANS {} JOURS", d),
                3,
            ),
            d if d > 7 => (
                "green".to_string(),
                "ECHEANCE DANS PLUS D'UNE SEMAINE".to_string(),
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

    alerts.sort_by_key(|alert| (alert.urgency_order, alert.days_remaining));
    alerts
}

fn build_export_payload(tasks: &[Task]) -> ExportPayload {
    let planificateur = tasks
        .iter()
        .map(|task| PlanificateurRow {
            numero: task.numero.map(|value| serde_json::Value::Number(value.into())),
            activite: Some(task.activite.clone()),
            tache: Some(task.tache.clone()),
            description: task.description.clone(),
            source: task.source.clone(),
            nature: task.nature.clone(),
            extrant_attendu: task.extrant_attendu.clone(),
            iov: task.iov.clone(),
            responsable: task.responsable.clone(),
            date_debut: task.date_debut.clone(),
            date_fin: task.date_fin.clone(),
            duree: task
                .duree
                .or_else(|| task_duration(task))
                .map(|value| serde_json::Value::Number(value.into())),
            priorite: task.priorite.clone(),
            etat_avancement: task.etat_avancement.clone(),
            extrants_obtenus: task.extrants_obtenus.clone(),
            livrables_fournis: task.livrables_fournis.clone(),
            observations: task.observations.clone(),
            etat: task.etat.clone(),
        })
        .collect::<Vec<_>>();

    let gantt = tasks
        .iter()
        .filter(|task| task.date_debut.is_some() || task.date_fin.is_some())
        .map(|task| GanttRow {
            tache: task.tache.clone(),
            date_debut: task.date_debut.clone(),
            duree: task.duree.or_else(|| task_duration(task)),
            etat_avancement: task.etat_avancement.clone(),
        })
        .collect::<Vec<_>>();

    ExportPayload {
        generated_at: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        source_file: PYTHON_JSON_FILE_NAME.to_string(),
        planificateur,
        gantt: if gantt.is_empty() { None } else { Some(gantt) },
    }
}

fn import_tasks_from_json(content: &str) -> Result<Vec<Task>, String> {
    if let Ok(data) = serde_json::from_str::<AppData>(content) {
        return Ok(data.tasks);
    }

    let payload: ExportPayload =
        serde_json::from_str(content).map_err(|e| format!("Format JSON non reconnu : {}", e))?;

    Ok(payload
        .planificateur
        .into_iter()
        .enumerate()
        .map(|(index, row)| {
            let numero = row.numero.and_then(|value| match value {
                serde_json::Value::Number(number) => number.as_i64().map(|value| value as i32),
                serde_json::Value::String(text) => text.parse::<i32>().ok(),
                _ => None,
            });

            let duree = row.duree.and_then(|value| match value {
                serde_json::Value::Number(number) => number.as_i64().map(|value| value as i32),
                serde_json::Value::String(text) => text.parse::<i32>().ok(),
                _ => None,
            });

            normalize_task(Task {
                id: Uuid::new_v4().to_string(),
                numero,
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
                duree,
                priorite: row.priorite,
                etat_avancement: row.etat_avancement,
                extrants_obtenus: row.extrants_obtenus,
                livrables_fournis: row.livrables_fournis,
                observations: row.observations,
                etat: row.etat,
            }, index as i32 + 1)
        })
        .collect())
}

fn get_startup_shortcut_path() -> PathBuf {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
        .join("Startup")
        .join(STARTUP_SHORTCUT_NAME)
}

fn escape_powershell_single_quotes(value: &str) -> String {
    value.replace('\'', "''")
}

fn create_startup_shortcut() -> Result<(), String> {
    let shortcut = get_startup_shortcut_path();
    let target = std::env::current_exe().map_err(|error| format!("Unable to resolve executable path: {}", error))?;
    let target_str = escape_powershell_single_quotes(&target.to_string_lossy());
    let shortcut_str = escape_powershell_single_quotes(&shortcut.to_string_lossy());
    let working_dir_str = escape_powershell_single_quotes(
        &target
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."))
            .to_string_lossy(),
    );
    let description_str = escape_powershell_single_quotes(
        "Lance Alertes Taches desktop au demarrage Windows",
    );

    if let Some(parent) = shortcut.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Unable to create startup directory: {}", error))?;
    }

    let script = format!(
        "$ws=New-Object -ComObject WScript.Shell;\
         $sc=$ws.CreateShortcut('{shortcut_str}');\
         $sc.TargetPath='{target_str}';\
         $sc.Arguments='--sticky-notes';\
         $sc.WorkingDirectory='{working_dir_str}';\
         $sc.Description='{description_str}';\
         $sc.IconLocation='{target_str},0';\
         $sc.Save();"
    );

    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|error| format!("Unable to execute PowerShell: {}", error))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(())
}

fn set_startup_shortcut(enabled: bool) -> Result<(), String> {
    let path = get_startup_shortcut_path();
    if enabled {
        create_startup_shortcut()
    } else if path.exists() {
        fs::remove_file(path).map_err(|error| format!("Unable to remove startup shortcut: {}", error))
    } else {
        Ok(())
    }
}

fn write_temp_script(prefix: &str, content: &str) -> Result<PathBuf, String> {
    let path = std::env::temp_dir().join(format!(
        "{}_{}_{}.ps1",
        prefix,
        std::process::id(),
        Local::now().format("%Y%m%d%H%M%S%3f")
    ));
    fs::write(&path, content).map_err(|error| format!("Unable to write temporary PowerShell script: {}", error))?;
    Ok(path)
}

fn run_powershell_script(script: &str, params: &[(&str, String)]) -> Result<String, String> {
    if cfg!(not(target_os = "windows")) {
        return Err("La synchronisation telephone est disponible uniquement sous Windows.".to_string());
    }

    let script_path = write_temp_script("alertes_taches_sync", script)?;
    let mut command = Command::new("powershell.exe");
    command.args(["-ExecutionPolicy", "Bypass", "-NonInteractive", "-File"]);
    command.arg(&script_path);

    for (name, value) in params {
        command.arg(format!("-{}", name));
        command.arg(value);
    }

    let output = command
        .output()
        .map_err(|error| format!("Unable to execute PowerShell script: {}", error))?;

    let _ = fs::remove_file(script_path);

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        Ok(stdout)
    } else if !stderr.is_empty() {
        Err(stderr)
    } else if !stdout.is_empty() {
        Err(stdout)
    } else {
        Err("PowerShell command failed.".to_string())
    }
}

fn sanitize_window_label(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();
    sanitized.trim_matches('-').to_string()
}

fn screen_bounds(app: &AppHandle) -> (f64, f64, f64, f64) {
    app
        .get_webview_window("main")
        .and_then(|window| window.primary_monitor().ok().flatten())
        .map(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            let scale = monitor.scale_factor().max(1.0);
            (
                position.x as f64 / scale,
                position.y as f64 / scale,
                size.width as f64 / scale,
                size.height as f64 / scale,
            )
        })
        .unwrap_or((0.0, 0.0, 1440.0, 900.0))
}

fn note_positions(app: &AppHandle, heights: &[f64]) -> Vec<(f64, f64)> {
    let (origin_x, origin_y, screen_width, screen_height) = screen_bounds(app);
    let mut positions = Vec::new();
    let mut current_y = origin_y + NOTE_MARGIN;
    let mut column_index = 0.0;

    for height in heights {
        if current_y + height > origin_y + screen_height - NOTE_MARGIN && !positions.is_empty() {
            column_index += 1.0;
            current_y = origin_y + NOTE_MARGIN;
        }

        let x = (origin_x + screen_width - NOTE_WIDTH - NOTE_MARGIN - (column_index * NOTE_OFFSET_X))
            .max(origin_x + NOTE_MARGIN);
        let y = current_y.max(origin_y + NOTE_MARGIN);
        positions.push((x, y));
        current_y = y + height + NOTE_OFFSET_Y;
    }

    positions
}

fn close_existing_sticky_windows(app: &AppHandle, state: &RuntimeState) {
    let labels = state
        .sticky_notes
        .lock()
        .map(|notes| notes.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default();

    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }

    if let Ok(mut notes) = state.sticky_notes.lock() {
        notes.clear();
    }
}

fn apply_sticky_note_layout(app: &AppHandle, state: &RuntimeState) -> Result<(), String> {
    let note_entries = state
        .sticky_notes
        .lock()
        .map_err(|_| "Sticky notes state is unavailable.".to_string())?
        .iter()
        .map(|(label, note)| (label.clone(), note.clone()))
        .collect::<Vec<_>>();

    if note_entries.is_empty() {
        return Ok(());
    }

    let (_, _, _, screen_height) = screen_bounds(app);
    let max_height = (screen_height - (NOTE_MARGIN * 2.0)).max(NOTE_MIN_HEIGHT);
    let mut ordered_notes = note_entries;
    ordered_notes.sort_by_key(|(_, note)| note.order);

    let heights = ordered_notes
        .iter()
        .map(|(_, note)| note.window_height.clamp(NOTE_MIN_HEIGHT, max_height))
        .collect::<Vec<_>>();
    let positions = note_positions(app, &heights);

    for (index, (label, _note)) in ordered_notes.iter().enumerate() {
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.set_size(LogicalSize::new(NOTE_WIDTH, heights[index]));
            if let Some((x, y)) = positions.get(index).copied() {
                let _ = window.set_position(LogicalPosition::new(x, y));
            }
        }
    }

    Ok(())
}

fn create_sticky_windows(app: &AppHandle, state: &RuntimeState, alerts: &[Alert]) -> Result<usize, String> {
    close_existing_sticky_windows(app, state);
    if alerts.is_empty() {
        return Ok(0);
    }

    let positions = note_positions(app, &vec![NOTE_HEIGHT; alerts.len()]);
    let mut sticky_notes = HashMap::new();
    let mut pending_windows = Vec::new();

    for (index, alert) in alerts.iter().enumerate() {
        let label = format!(
            "sticky-note-{}-{}",
            index + 1,
            sanitize_window_label(&alert.task.id)
        );
        let note_payload = StickyNotePayload {
            label: alert.label.clone(),
            color: alert.color.clone(),
            tache: alert.task.tache.clone(),
            description: alert
                .task
                .description
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "-".to_string()),
            responsable: alert
                .task
                .responsable
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "-".to_string()),
            date_fin: alert
                .task
                .date_fin
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "-".to_string()),
            show_close_all: index == 0,
            order: index,
            window_height: NOTE_HEIGHT,
        };

        let (x, y) = positions.get(index).copied().unwrap_or((80.0, 80.0));
        sticky_notes.insert(label.clone(), note_payload);
        pending_windows.push((label, alert.task.tache.clone(), x, y));
    }

    if let Ok(mut notes) = state.sticky_notes.lock() {
        *notes = sticky_notes;
    }

    for (label, task_title, x, y) in pending_windows {
        WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
            .title(format!("Alertes Taches - {}", task_title))
            .decorations(false)
            .resizable(false)
            .visible(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .transparent(true)
            .shadow(false)
            .inner_size(NOTE_WIDTH, NOTE_HEIGHT)
            .position(x, y)
            .build()
            .map_err(|error| format!("Unable to create sticky note window: {}", error))?;

        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }

    apply_sticky_note_layout(app, state)?;

    Ok(alerts.len())
}

fn is_sticky_mode() -> bool {
    std::env::args().any(|argument| argument == "--sticky-notes")
}

#[tauri::command]
fn load_tasks(app: AppHandle) -> Result<AppData, String> {
    read_app_data(&app)
}

#[tauri::command]
fn save_tasks(app: AppHandle, tasks: Vec<Task>) -> Result<AppData, String> {
    let normalized = tasks
        .into_iter()
        .enumerate()
        .map(|(index, task)| normalize_task(task, index as i32 + 1))
        .collect::<Vec<_>>();
    write_app_data(&app, normalized)
}

#[tauri::command]
fn add_task(app: AppHandle, task: Task) -> Result<Task, String> {
    let mut data = read_app_data(&app)?;
    let next_numero = data
        .tasks
        .iter()
        .filter_map(|current| current.numero)
        .max()
        .unwrap_or(0)
        + 1;
    let task = normalize_task(task.with_new_id(), next_numero);
    data.tasks.push(task.clone());
    write_app_data(&app, data.tasks)?;
    Ok(task)
}

#[tauri::command]
fn update_task(app: AppHandle, task: Task) -> Result<Task, String> {
    let mut data = read_app_data(&app)?;
    let next_numero = data
        .tasks
        .iter()
        .filter_map(|current| current.numero)
        .max()
        .unwrap_or(0)
        + 1;
    let task = normalize_task(task, next_numero);
    if let Some(existing) = data.tasks.iter_mut().find(|current| current.id == task.id) {
        *existing = task.clone();
    }
    write_app_data(&app, data.tasks)?;
    Ok(task)
}

#[tauri::command]
fn delete_task(app: AppHandle, id: String) -> Result<AppData, String> {
    let mut data = read_app_data(&app)?;
    data.tasks.retain(|task| task.id != id);
    write_app_data(&app, data.tasks)
}

#[tauri::command]
fn get_active_alerts(app: AppHandle) -> Result<Vec<Alert>, String> {
    let data = read_app_data(&app)?;
    Ok(build_active_alerts(&data.tasks))
}

#[tauri::command]
fn import_json(content: String) -> Result<Vec<Task>, String> {
    import_tasks_from_json(&content)
}

#[tauri::command]
fn export_json(app: AppHandle) -> Result<String, String> {
    let data = read_app_data(&app)?;
    serde_json::to_string_pretty(&build_export_payload(&data.tasks))
        .map_err(|error| format!("Serialization failed: {}", error))
}

#[tauri::command]
fn save_export_file(
    app: AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let exports_dir = get_exports_dir(&app)?;
    let file_path = exports_dir.join(file_name);
    fs::write(&file_path, bytes).map_err(|error| format!("Unable to write export file: {}", error))?;
    open_directory_in_explorer(&exports_dir)?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_stats(app: AppHandle) -> Result<serde_json::Value, String> {
    let data = read_app_data(&app)?;
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

        if let Some(date_fin) = task
            .date_fin
            .as_deref()
            .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
        {
            let days = (date_fin - today).num_days();
            if days < 0 && !state.contains("termin") {
                overdue += 1;
            } else if days == 0 && !state.contains("termin") {
                due_today += 1;
            } else if (1..=7).contains(&days) && !state.contains("termin") {
                due_soon += 1;
            }
        }
    }

    let alerts = build_active_alerts(&data.tasks);
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
fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let settings = load_settings_from_disk(&app);
    store_settings_in_cache(&settings);
    Ok(settings)
}

#[tauri::command]
fn update_settings(app: AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    set_startup_shortcut(settings.launch_sticky_notes_on_startup)?;

    let mut next_settings = settings;
    next_settings.launch_sticky_notes_on_startup = get_startup_shortcut_path().exists();
    save_settings_to_disk(&app, &next_settings)?;
    store_settings_in_cache(&next_settings);
    let _ = append_app_log("INFO", "settings", "Desktop settings updated");
    Ok(next_settings)
}

#[tauri::command]
fn write_app_log_entry(level: String, source: String, message: String) -> Result<(), String> {
    append_app_log(
        if level.trim().is_empty() { "INFO" } else { level.trim() },
        if source.trim().is_empty() { "frontend" } else { source.trim() },
        &message,
    )
    .map(|_| ())
    .map_err(|error| format!("Unable to write desktop log: {}", error))
}

#[tauri::command]
async fn preview_sticky_alerts(app: AppHandle, state: State<'_, RuntimeState>) -> Result<usize, String> {
    let data = read_app_data(&app)?;
    let alerts = build_active_alerts(&data.tasks);
    create_sticky_windows(&app, &state, &alerts)
}

#[tauri::command]
fn get_sticky_note(window_label: String, state: State<'_, RuntimeState>) -> Result<StickyNotePayload, String> {
    state
        .sticky_notes
        .lock()
        .map_err(|_| "Sticky notes state is unavailable.".to_string())?
        .get(&window_label)
        .cloned()
        .ok_or_else(|| "Sticky note payload introuvable.".to_string())
}

#[tauri::command]
fn update_sticky_note_layout(
    app: AppHandle,
    window_label: String,
    content_height: f64,
    state: State<'_, RuntimeState>,
) -> Result<(), String> {
    {
        let mut notes = state
            .sticky_notes
            .lock()
            .map_err(|_| "Sticky notes state is unavailable.".to_string())?;
        let note = notes
            .get_mut(&window_label)
            .ok_or_else(|| "Sticky note payload introuvable.".to_string())?;
        note.window_height = if content_height.is_finite() {
            content_height.max(NOTE_MIN_HEIGHT)
        } else {
            NOTE_HEIGHT
        };
    }

    apply_sticky_note_layout(&app, &state)
}

#[tauri::command]
fn close_current_sticky_window(
    app: AppHandle,
    window_label: String,
    state: State<'_, RuntimeState>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        let _ = window.close();
    }

    let remaining = {
        let mut notes = state
            .sticky_notes
            .lock()
            .map_err(|_| "Sticky notes state is unavailable.".to_string())?;
        notes.remove(&window_label);
        notes.len()
    };

    if remaining == 0 && state.sticky_mode {
        app.exit(0);
    }

    Ok(())
}

#[tauri::command]
fn close_all_sticky_windows(app: AppHandle, state: State<'_, RuntimeState>) -> Result<(), String> {
    close_existing_sticky_windows(&app, &state);
    if state.sticky_mode {
        app.exit(0);
    }
    Ok(())
}

#[tauri::command]
fn sync_to_phone(app: AppHandle) -> Result<String, String> {
    let data = read_app_data(&app)?;
    let payload = serde_json::to_string_pretty(&build_export_payload(&data.tasks))
        .map_err(|error| format!("Unable to build export payload: {}", error))?;
    let local_json_path = app.path().app_data_dir().map_err(|error| error.to_string())?.join(PYTHON_JSON_FILE_NAME);
    if let Some(parent) = local_json_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Unable to create sync directory: {}", error))?;
    }
    fs::write(&local_json_path, payload)
        .map_err(|error| format!("Unable to write phone sync JSON: {}", error))?;

    let result = run_powershell_script(
        PUSH_TO_PHONE_SCRIPT,
        &[
            ("LocalJsonPath", local_json_path.to_string_lossy().to_string()),
            ("TargetFolderName", "AlertesTaches".to_string()),
            ("FileName", PYTHON_JSON_FILE_NAME.to_string()),
        ],
    )?;
    let _ = append_app_log("INFO", "sync", "Phone sync push completed");
    Ok(result)
}

#[tauri::command]
fn sync_from_phone(app: AppHandle) -> Result<AppData, String> {
    let local_json_path = app.path().app_data_dir().map_err(|error| error.to_string())?.join(PYTHON_JSON_FILE_NAME);
    if let Some(parent) = local_json_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Unable to create sync directory: {}", error))?;
    }

    run_powershell_script(
        PULL_FROM_PHONE_SCRIPT,
        &[
            ("OutputJsonPath", local_json_path.to_string_lossy().to_string()),
            ("TargetFolderName", "AlertesTaches".to_string()),
            ("FileName", PYTHON_JSON_FILE_NAME.to_string()),
        ],
    )?;

    let content = fs::read_to_string(&local_json_path)
        .map_err(|error| format!("Unable to read imported phone JSON: {}", error))?;
    let tasks = import_tasks_from_json(&content)?;
    let normalized = tasks
        .into_iter()
        .enumerate()
        .map(|(index, task)| normalize_task(task, index as i32 + 1))
        .collect::<Vec<_>>();
    let data = write_app_data(&app, normalized)?;
    let _ = append_app_log("INFO", "sync", "Phone sync pull completed");
    Ok(data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register_panic_logger();
    let sticky_mode = is_sticky_mode();

    let builder = tauri::Builder::default()
        .manage(RuntimeState {
            sticky_notes: Mutex::new(HashMap::new()),
            sticky_mode,
        })
        .setup(move |app| {
            let settings = load_settings_from_disk(&app.handle());
            store_settings_in_cache(&settings);

            if sticky_mode {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }

                let data = read_app_data(&app.handle())?;
                let alerts = build_active_alerts(&data.tasks);
                if alerts.is_empty() {
                    app.handle().exit(0);
                    return Ok(());
                }

                let state: State<'_, RuntimeState> = app.state();
                create_sticky_windows(&app.handle(), &state, &alerts)?;
            }

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
            save_export_file,
            get_stats,
            get_settings,
            update_settings,
            write_app_log_entry,
            preview_sticky_alerts,
            get_sticky_note,
            update_sticky_note_layout,
            close_current_sticky_window,
            close_all_sticky_windows,
            sync_to_phone,
            sync_from_phone,
        ]);

    if let Err(error) = builder.run(tauri::generate_context!()) {
        let _ = append_app_log(
            "ERROR",
            "backend",
            &format!("Tauri startup failed: {}", error),
        );
        panic!("Erreur au demarrage de Tauri: {}", error);
    }
}
