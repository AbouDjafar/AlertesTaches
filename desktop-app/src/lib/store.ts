export interface Task {
  id: string; // uuid
  numero: number;
  activite: string;
  tache: string;
  description: string;
  source: string;
  nature: string;
  extrantAttendu: string;
  iov: string;
  responsable: string;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string; // YYYY-MM-DD
  duree: number; // days
  priorite: string; // Élevé, Moyen, Faible
  etatAvancement: string; // Terminé, En cours, Non démarré
  extrantsObtenus: string;
  livrablesFournis: string;
  observations: string;
  etat: string | null;
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

export function getAlertLevel(daysRemaining: number): { color: string; label: string; palette: AlertPalette } | null {
  if (daysRemaining <= 0) return { color: "charcoal", label: daysRemaining === 0 ? "ÉCHÉANCE AUJOURD'HUI" : `DÉLAI DÉPASSÉ DE ${Math.abs(daysRemaining)} JOUR(S)`, palette: charcoalPalette };
  if (daysRemaining === 1) return { color: "pink", label: "ÉCHÉANCE DEMAIN", palette: pinkPalette };
  if (daysRemaining === 2) return { color: "yellow", label: "ÉCHÉANCE DANS 2 JOURS", palette: yellowPalette };
  if (daysRemaining >= 3 && daysRemaining <= 7) return { color: "blue", label: `ÉCHÉANCE DANS ${daysRemaining} JOURS`, palette: bluePalette };
  if (daysRemaining > 7) return { color: "green", label: "ÉCHÉANCE DANS PLUS D'UNE SEMAINE", palette: greenPalette };
  return null;
}

const STORAGE_KEY = "alertes_taches_data";

export function loadTasks(): Task[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const seed = generateSeedData();
    saveTasks(seed);
    return seed;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function generateSeedData(): Task[] {
  const today = new Date();
  const offsetDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  return [
    {
      id: crypto.randomUUID(),
      numero: 1,
      activite: "Phase 1",
      tache: "Finaliser le cahier des charges",
      description: "Document de spécifications détaillées",
      source: "Client",
      nature: "Documentation",
      extrantAttendu: "Cahier des charges validé",
      iov: "Signature du document",
      responsable: "Jean Dupont",
      dateDebut: offsetDate(-10),
      dateFin: offsetDate(-2), // Overdue
      duree: 8,
      priorite: "Élevé",
      etatAvancement: "En cours",
      extrantsObtenus: "",
      livrablesFournis: "",
      observations: "En attente de retour",
      etat: null
    },
    {
      id: crypto.randomUUID(),
      numero: 2,
      activite: "Phase 1",
      tache: "Validation maquettes",
      description: "Validation des designs UI/UX",
      source: "Équipe Design",
      nature: "Design",
      extrantAttendu: "Figma finalisé",
      iov: "Approbation client",
      responsable: "Alice Martin",
      dateDebut: offsetDate(-5),
      dateFin: offsetDate(1), // Tomorrow
      duree: 6,
      priorite: "Moyen",
      etatAvancement: "En cours",
      extrantsObtenus: "Maquettes V1",
      livrablesFournis: "",
      observations: "",
      etat: null
    },
    {
      id: crypto.randomUUID(),
      numero: 3,
      activite: "Phase 2",
      tache: "Développement API",
      description: "Création des endpoints backend",
      source: "Équipe Dev",
      nature: "Code",
      extrantAttendu: "API fonctionnelle",
      iov: "Tests validés",
      responsable: "Marc Tremblay",
      dateDebut: offsetDate(0),
      dateFin: offsetDate(4), // In 4 days
      duree: 4,
      priorite: "Élevé",
      etatAvancement: "Non démarré",
      extrantsObtenus: "",
      livrablesFournis: "",
      observations: "",
      etat: null
    }
  ];
}
