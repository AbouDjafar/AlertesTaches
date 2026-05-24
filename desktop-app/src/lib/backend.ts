import { invoke } from "@tauri-apps/api/core";
import type { AppData, AppSettings, StickyNotePayload, Task } from "@/lib/store";

export async function loadAppData() {
  return invoke<AppData>("load_tasks");
}

export async function saveAllTasks(tasks: Task[]) {
  return invoke<AppData>("save_tasks", { tasks });
}

export async function importJsonContent(content: string) {
  return invoke<Task[]>("import_json", { content });
}

export async function exportJsonContent() {
  return invoke<string>("export_json");
}

export async function getDesktopSettings() {
  return invoke<AppSettings>("get_settings");
}

export async function updateDesktopSettings(settings: AppSettings) {
  return invoke<AppSettings>("update_settings", { settings });
}

export async function previewStickyAlerts() {
  return invoke<number>("preview_sticky_alerts");
}

export async function getStickyNote(windowLabel: string) {
  return invoke<StickyNotePayload>("get_sticky_note", { windowLabel });
}

export async function updateStickyNoteLayout(windowLabel: string, contentHeight: number) {
  return invoke("update_sticky_note_layout", { windowLabel, contentHeight });
}

export async function closeCurrentStickyWindow(windowLabel: string) {
  return invoke("close_current_sticky_window", { windowLabel });
}

export async function closeAllStickyWindows() {
  return invoke("close_all_sticky_windows");
}

export async function syncToPhone() {
  return invoke<string>("sync_to_phone");
}

export async function syncFromPhone() {
  return invoke<AppData>("sync_from_phone");
}
