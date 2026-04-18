import * as FileSystem from "expo-file-system/legacy";
import { Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PlanTask {
  "N°": number;
  "Activité": string;
  "Tâche": string;
  "Description"?: string;
  "Source": string;
  "Nature"?: string;
  "Extrant attendu"?: string;
  "IOV (Indicateur Objectivement Vérifiable)"?: string;
  "Responsable"?: string;
  "Date de début"?: string;
  "Date de fin": string;
  "Durée (jours)": number;
  "Priorité"?: string;
  "État d'avancement": string;
  "Extrants obtenus à date"?: string;
  "Livrables fournis"?: string;
  "Observations"?: string;
  "Etat"?: string | null;
}

export interface PlanData {
  generated_at?: string;
  source_file?: string;
  planificateur: PlanTask[];
}

export interface Task {
  nom: string;
  echeance: string;
  personne: string;
  duree: number;
  details: string;
  terminee: boolean;
}

export interface Settings {
  username: string;
  notificationHour: number;
  notificationMinute: number;
}

export const DEFAULT_SETTINGS: Settings = {
  username: "utilisateur",
  notificationHour: 8,
  notificationMinute: 0,
};

const SETTINGS_KEY = "@alertes_taches_settings";
const SAF_DIRECTORY_KEY = "@alertes_taches_saf_directory_uri";
export const STORAGE_FOLDER = "file:///storage/emulated/0/AlertesTaches/";

type SafApi = {
  requestDirectoryPermissionsAsync: () => Promise<{
    granted: boolean;
    directoryUri?: string;
  }>;
  readDirectoryAsync: (directoryUri: string) => Promise<string[]>;
  createFileAsync: (
    parentUri: string,
    fileName: string,
    mimeType: string
  ) => Promise<string>;
};

type FileSystemWithSaf = typeof FileSystem & {
  StorageAccessFramework?: SafApi;
};

function getSafApi(): SafApi | null {
  return ((FileSystem as FileSystemWithSaf).StorageAccessFramework ?? null) as SafApi | null;
}

function parsePlanContent(content: string): PlanData | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return { planificateur: parsed as PlanTask[] };
    }
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "planificateur" in parsed &&
      Array.isArray((parsed as { planificateur?: unknown }).planificateur)
    ) {
      return parsed as PlanData;
    }
  } catch {}
  return null;
}

function filenameFromUri(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const normalized = decoded.replace(/\\/g, "/");
    const parts = normalized.split("/");
    const last = parts[parts.length - 1] || normalized;
    const colonParts = last.split(":");
    return colonParts[colonParts.length - 1] || last;
  } catch {
    const parts = uri.split("/");
    return parts[parts.length - 1] || uri;
  }
}

function isJsonFilename(name: string): boolean {
  return name.toLowerCase().endsWith(".json");
}

export function getDaysRemaining(dateDeFin: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateDeFin);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getTaskColor(daysRemaining: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (daysRemaining <= 0) {
    return {
      bg: "#d6d8db",
      text: "#383d41",
      label:
        daysRemaining === 0
          ? "Aujourd'hui"
          : `Dépassé de ${Math.abs(daysRemaining)}j`,
    };
  }
  if (daysRemaining === 1) {
    return { bg: "#f8d7da", text: "#721c24", label: "Demain" };
  }
  if (daysRemaining === 2) {
    return { bg: "#fff3cd", text: "#856404", label: "Dans 2 jours" };
  }
  if (daysRemaining >= 3 && daysRemaining <= 7) {
    return {
      bg: "#cce5ff",
      text: "#004085",
      label: `Dans ${daysRemaining} jours`,
    };
  }
  return {
    bg: "#d4edda",
    text: "#155724",
    label: `Dans ${daysRemaining} jours`,
  };
}

export function isTaskDone(task: PlanTask): boolean {
  const etat = (task["État d'avancement"] || "").toLowerCase().trim();
  return etat === "terminée" || etat === "terminé";
}

export function filterActiveTasks(tasks: PlanTask[]): PlanTask[] {
  return tasks.filter((t) => !isTaskDone(t));
}

export function sortTasksByDeadline(tasks: PlanTask[]): PlanTask[] {
  return [...tasks].sort((a, b) => {
    const daysA = getDaysRemaining(a["Date de fin"]);
    const daysB = getDaysRemaining(b["Date de fin"]);
    return daysA - daysB;
  });
}

export function groupTasksByDeadline(tasks: PlanTask[]): Map<number, PlanTask[]> {
  const groups = new Map<number, PlanTask[]>();
  for (const task of tasks) {
    const days = getDaysRemaining(task["Date de fin"]);
    const existing = groups.get(days) || [];
    existing.push(task);
    groups.set(days, existing);
  }
  return groups;
}

async function requestReadPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: "Accès au stockage",
        message:
          "Alertes Tâches doit accéder au dossier AlertesTaches sur votre téléphone.",
        buttonPositive: "Autoriser",
        buttonNegative: "Refuser",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function requestWritePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "Accès en écriture",
        message:
          "Alertes Tâches doit modifier le fichier JSON dans AlertesTaches.",
        buttonPositive: "Autoriser",
        buttonNegative: "Refuser",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function tryReadDirectFolder(): Promise<StorageResult> {
  try {
    const folderInfo = await FileSystem.getInfoAsync(STORAGE_FOLDER);
    if (!folderInfo.exists) {
      return { data: null, filename: null, error: "no_folder" };
    }

    const files = await FileSystem.readDirectoryAsync(STORAGE_FOLDER);
    const jsonFiles = files.filter(isJsonFilename);
    if (jsonFiles.length === 0) {
      return { data: null, filename: null, error: "no_file" };
    }

    const filename = jsonFiles[0];
    const fileUri = STORAGE_FOLDER + filename;
    const content = await FileSystem.readAsStringAsync(fileUri);
    const planData = parsePlanContent(content);
    if (!planData) {
      return { data: null, filename, error: "invalid_format" };
    }

    return { data: planData, filename, error: null };
  } catch {
    return { data: null, filename: null, error: "read_error" };
  }
}

async function tryReadSafFolder(directoryUri: string): Promise<StorageResult> {
  const saf = getSafApi();
  if (!saf) {
    return { data: null, filename: null, error: "read_error" };
  }

  try {
    const files = await saf.readDirectoryAsync(directoryUri);
    const jsonFileUri = files.find((uri) => isJsonFilename(filenameFromUri(uri)));
    if (!jsonFileUri) {
      return { data: null, filename: null, error: "no_file" };
    }

    const filename = filenameFromUri(jsonFileUri);
    const content = await FileSystem.readAsStringAsync(jsonFileUri);
    const planData = parsePlanContent(content);
    if (!planData) {
      return { data: null, filename, error: "invalid_format" };
    }

    return { data: planData, filename, error: null };
  } catch {
    return { data: null, filename: null, error: "read_error" };
  }
}

async function requestSafFolder(): Promise<string | null> {
  const saf = getSafApi();
  if (!saf) return null;

  try {
    const permission = await saf.requestDirectoryPermissionsAsync();
    if (!permission.granted || !permission.directoryUri) return null;
    await AsyncStorage.setItem(SAF_DIRECTORY_KEY, permission.directoryUri);
    return permission.directoryUri;
  } catch {
    return null;
  }
}

async function readWithStoredSafFolder(): Promise<StorageResult | null> {
  try {
    const directoryUri = await AsyncStorage.getItem(SAF_DIRECTORY_KEY);
    if (!directoryUri) return null;
    const result = await tryReadSafFolder(directoryUri);
    if (result.error === "read_error") {
      await AsyncStorage.removeItem(SAF_DIRECTORY_KEY);
    }
    return result;
  } catch {
    return null;
  }
}

export type StorageError =
  | "web"
  | "ios"
  | "no_folder"
  | "no_file"
  | "invalid_format"
  | "permission_denied"
  | "read_error"
  | null;

export interface StorageResult {
  data: PlanData | null;
  filename: string | null;
  error: StorageError;
}

export async function loadFromStorage(): Promise<StorageResult> {
  if (Platform.OS === "web") {
    return { data: null, filename: null, error: "web" };
  }
  if (Platform.OS === "ios") {
    return { data: null, filename: null, error: "ios" };
  }

  const direct = await tryReadDirectFolder();
  if (direct.data || direct.error === "invalid_format") {
    return direct;
  }

  const storedSaf = await readWithStoredSafFolder();
  if (storedSaf?.data || storedSaf?.error === "invalid_format") {
    return storedSaf;
  }

  const selectedDirectory = await requestSafFolder();
  if (selectedDirectory) {
    return tryReadSafFolder(selectedDirectory);
  }

  const legacyPermission = await requestReadPermission();
  if (!legacyPermission) {
    return { data: null, filename: null, error: "permission_denied" };
  }

  const directAfterPermission = await tryReadDirectFolder();
  if (directAfterPermission.error !== "read_error") {
    return directAfterPermission;
  }

  return { data: null, filename: null, error: "read_error" };
}

async function findSafJsonFile(directoryUri: string, filename: string): Promise<string | null> {
  const saf = getSafApi();
  if (!saf) return null;
  try {
    const files = await saf.readDirectoryAsync(directoryUri);
    return (
      files.find((uri) => filenameFromUri(uri).toLowerCase() === filename.toLowerCase()) ??
      null
    );
  } catch {
    return null;
  }
}

async function saveWithSaf(data: PlanData, filename: string): Promise<boolean> {
  const saf = getSafApi();
  if (!saf) return false;

  try {
    let directoryUri = await AsyncStorage.getItem(SAF_DIRECTORY_KEY);
    if (!directoryUri) {
      directoryUri = await requestSafFolder();
    }
    if (!directoryUri) return false;

    let fileUri = await findSafJsonFile(directoryUri, filename);
    if (!fileUri) {
      fileUri = await saf.createFileAsync(directoryUri, filename, "application/json");
    }
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function saveToStorage(
  data: PlanData,
  filename: string
): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const fileUri = STORAGE_FOLDER + filename;
  try {
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
    return true;
  } catch {
    if (await saveWithSaf(data, filename)) {
      return true;
    }

    const granted = await requestWritePermission();
    if (!granted) return false;
    try {
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(data, null, 2)
      );
      return true;
    } catch {
      return false;
    }
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored) as Settings;
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
