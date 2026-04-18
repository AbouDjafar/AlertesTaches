import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import { PlanData } from "./core";

export async function shareJsonFile(
  planData: PlanData,
  filename: string,
  username: string
): Promise<void> {
  if (Platform.OS === "web") {
    Alert.alert("Non disponible", "Le partage n'est pas disponible sur le web");
    return;
  }

  try {
    const copyName = `${username}_${filename}`;
    const copyPath = FileSystem.documentDirectory + copyName;

    await FileSystem.writeAsStringAsync(
      copyPath,
      JSON.stringify(planData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(copyPath, {
        mimeType: "application/json",
        dialogTitle: "Partager les tâches",
      });
    } else {
      Alert.alert(
        "Partage indisponible",
        "Le partage n'est pas disponible sur cet appareil"
      );
    }
  } catch {
    Alert.alert("Erreur", "Impossible de partager le fichier");
  }
}
