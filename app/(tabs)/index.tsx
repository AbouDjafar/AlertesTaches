import React from "react";
import { View, Text, StyleSheet, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { HomeButton } from "@/components/HomeButton";
import { useTasks } from "@/context/TaskContext";
import { shareJsonFile } from "@/utils/shareJson";
import colors from "@/constants/colors";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTasks, planData, jsonFilename, settings } = useTasks();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleShare = async () => {
    if (!planData || !jsonFilename) {
      Alert.alert(
        "Aucune tâche à partager",
        "Aucun fichier JSON n'a été trouvé dans le dossier AlertesTaches."
      );
      return;
    }
    await shareJsonFile(planData, jsonFilename, settings.username);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
      <View style={styles.headerSection}>
        <View style={styles.iconWrapper}>
          <Feather name="bell" size={32} color={colors.light.primary} />
        </View>
        <Text style={styles.appTitle}>Alertes Tâches</Text>
        <Text style={styles.subtitle}>
          {activeTasks.length > 0
            ? `${activeTasks.length} tâche(s) active(s)`
            : "Aucune tâche en cours pour l'instant"}
        </Text>
        {jsonFilename && (
          <View style={styles.fileTag}>
            <Feather
              name="file"
              size={12}
              color={colors.light.mutedForeground}
            />
            <Text style={styles.fileTagText} numberOfLines={1}>
              {jsonFilename}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.grid}>
        <HomeButton
          icon="list"
          label="Tâches"
          color="#e94560"
          onPress={() => router.push("/(tabs)/tasks")}
        />
        <HomeButton
          icon="share-2"
          label="Partager"
          color="#0f3460"
          onPress={handleShare}
        />
        <HomeButton
          icon="settings"
          label="Réglages"
          color="#16213e"
          onPress={() => router.push("/(tabs)/settings")}
        />
        <HomeButton
          icon="info"
          label="À propos"
          color="#533483"
          onPress={() => router.push("/(tabs)/about")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 36,
    gap: 8,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.light.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  fileTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.light.muted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fileTagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    maxWidth: 220,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },
});
