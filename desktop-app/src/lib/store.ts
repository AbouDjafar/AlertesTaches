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
