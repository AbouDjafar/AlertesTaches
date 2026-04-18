import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import { Task } from "./core";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function tasksToCSV(tasks: Task[]): string {
  const headers = ["Nom", "Échéance", "Personne", "Durée (jours)", "Détails", "Terminée"];
  const rows = tasks.map((t) => [
    escapeCSV(t.nom),
    escapeCSV(t.echeance),
    escapeCSV(t.personne),
    String(t.duree),
    escapeCSV(t.details),
    t.terminee ? "Oui" : "Non",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function exportAndShareTasks(
  tasks: Task[],
  username: string
): Promise<void> {
  if (Platform.OS === "web") {
    const csv = tasksToCSV(tasks);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}_taches.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const csv = tasksToCSV(tasks);
    const fileName = `${username}_taches.csv`;
    const filePath = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: "text/csv",
        dialogTitle: "Partager les tâches",
      });
    } else {
      Alert.alert("Partage", "Le partage n'est pas disponible sur cet appareil");
    }
  } catch (error) {
    Alert.alert("Erreur", "Impossible d'exporter les tâches");
  }
}
