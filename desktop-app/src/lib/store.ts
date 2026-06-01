import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";

export interface Task {
  id: string;
  numero: number;
  activite: string;
  tache: string;
  description: string;
  source: string;
  nature: string;
  extrantAttendu: string;
  iov: string;
  responsable: string;
  dateDebut: string;
  dateFin: string;
  duree: number;
  priorite: string;
  etatAvancement: string;
  extrantsObtenus: string;
  livrablesFournis: string;
  observations: string;
  etat: string | null;
}

export interface AppData {
  tasks: Task[];
  generatedAt: string;
  version: string;
}

export interface AppSettings {
  verboseLogs: boolean;
  launchStickyNotesOnStartup: boolean;
}

export interface StickyNotePayload {
  label: string;
  color: string;
  tache: string;
  description: string;
  responsable: string;
  dateFin: string;
  showCloseAll: boolean;
}

function safeText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return String(value);
}

function slugText(value: unknown) {
  return safeText(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'\u0060\u00B4]/g, "")
    .replace(/[^a-zA-Z]+/g, "")
    .toLowerCase();
}

function safePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function computeDuration(dateDebut: string, dateFin: string, fallback: number) {
  if (!dateDebut || !dateFin) {
    return fallback;
  }

  try {
    return Math.abs(differenceInDays(parseISO(dateFin), parseISO(dateDebut)));
  } catch {
    return fallback;
  }
}

export function normalizePriority(value: unknown) {
  const text = safeText(value).trim();
  const slug = slugText(value);

  if (slug.startsWith("elev")) {
    return "Élevé";
  }
  if (slug.startsWith("moy")) {
    return "Moyen";
  }
  if (slug.startsWith("faib")) {
    return "Faible";
  }

  return text;
}

export function getPriorityRank(value: unknown) {
  const normalized = normalizePriority(value);

  if (normalized === "Élevé") {
    return 0;
  }
  if (normalized === "Moyen") {
    return 1;
  }
  if (normalized === "Faible") {
    return 2;
  }

  return 99;
}

export function normalizeTask(task: Partial<Task>, index = 0): Task {
  const dateDebut = safeText(task.dateDebut);
  const dateFin = safeText(task.dateFin);
  const fallbackDuration = typeof task.duree === "number" && Number.isFinite(task.duree) ? task.duree : 0;

  return {
    id: safeText(task.id) || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `task-${Date.now()}-${index}`),
    numero: safePositiveNumber(task.numero, index + 1),
    activite: safeText(task.activite),
    tache: safeText(task.tache),
    description: safeText(task.description),
    source: safeText(task.source),
    nature: safeText(task.nature),
    extrantAttendu: safeText(task.extrantAttendu),
    iov: safeText(task.iov),
    responsable: safeText(task.responsable),
    dateDebut,
    dateFin,
    duree: computeDuration(dateDebut, dateFin, fallbackDuration),
    priorite: normalizePriority(task.priorite),
    etatAvancement: safeText(task.etatAvancement, "Non démarré") || "Non démarré",
    extrantsObtenus: safeText(task.extrantsObtenus),
    livrablesFournis: safeText(task.livrablesFournis),
    observations: safeText(task.observations),
    etat: task.etat == null ? null : safeText(task.etat),
  };
}

export function normalizeTasks(tasks: Partial<Task>[]) {
  return tasks.map((task, index) => normalizeTask(task, index));
}

export function getTaskStatusText(task: Partial<Task>) {
  return safeText(task.etatAvancement, "Non démarré").toLowerCase();
}

export function isTaskCompleted(task: Partial<Task>) {
  return getTaskStatusText(task).includes("termin");
}

export type AlertPalette = {
  surface: string;
  accent: string;
};

export const charcoalPalette: AlertPalette = { surface: "#ECEFF3", accent: "#6F7C8D" };
export const pinkPalette: AlertPalette = { surface: "#FFF3F8", accent: "#D98AA7" };
export const yellowPalette: AlertPalette = { surface: "#FFF9E9", accent: "#D9B35A" };
export const bluePalette: AlertPalette = { surface: "#EEF5FF", accent: "#79A8E2" };
export const greenPalette: AlertPalette = { surface: "#EFFAF2", accent: "#79B98E" };

export const LEGACY_STORAGE_KEY = "alertes_taches_data";

export function getAlertLevel(daysRemaining: number): { color: string; label: string; palette: AlertPalette } | null {
  if (daysRemaining <= 0) {
    return {
      color: "charcoal",
      label: daysRemaining === 0 ? "ECHEANCE AUJOURD'HUI" : `DELAI DEPASSE DE ${Math.abs(daysRemaining)} JOUR(S)`,
      palette: charcoalPalette,
    };
  }
  if (daysRemaining === 1) return { color: "pink", label: "ECHEANCE DEMAIN", palette: pinkPalette };
  if (daysRemaining === 2) return { color: "yellow", label: "ECHEANCE DANS 2 JOURS", palette: yellowPalette };
  if (daysRemaining >= 3 && daysRemaining <= 7) {
    return { color: "blue", label: `ECHEANCE DANS ${daysRemaining} JOURS`, palette: bluePalette };
  }
  if (daysRemaining > 7) {
    return { color: "green", label: "ECHEANCE DANS PLUS D'UNE SEMAINE", palette: greenPalette };
  }
  return null;
}

export function readLegacyTasks(): Task[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearLegacyTasks() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}
