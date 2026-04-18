import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { useTasks } from "@/context/TaskContext";

export default function TaskDetailScreen() {
  const { index } = useLocalSearchParams<{ index?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planData, markComplete, deleteTask } = useTasks();

  const taskIndex = Number(index);
  const task =
    Number.isInteger(taskIndex) && taskIndex >= 0
      ? planData?.planificateur[taskIndex]
      : undefined;

  const handleMarkComplete = () => {
    if (!task) return;

    Alert.alert(
      "Marquer comme terminée ?",
      `"${task["Tâche"]}" sera marquée comme terminée dans le fichier JSON.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Terminer",
          onPress: async () => {
            const ok = await markComplete(task);
            if (!ok) {
              Alert.alert("Erreur", "Impossible de mettre à jour le fichier JSON.");
              return;
            }
            router.back();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!task) return;

    Alert.alert(
      "Supprimer la tâche ?",
      `"${task["Tâche"]}" sera supprimée définitivement du fichier JSON.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteTask(task);
            if (!ok) {
              Alert.alert("Erreur", "Impossible de supprimer la tâche.");
              return;
            }
            router.replace("/(tabs)/tasks");
          },
        },
      ]
    );
  };

  if (!task) {
    return (
      <View style={styles.emptyScreen}>
        <Stack.Screen options={{ title: "Tâche" }} />
        <Text style={styles.emptyTitle}>Tâche introuvable</Text>
        <Text style={styles.emptyText}>
          Cette tâche n&apos;est plus disponible dans le fichier JSON.
        </Text>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/(tabs)/tasks")}>
          <Text style={styles.backBtnText}>Retour aux tâches</Text>
        </Pressable>
      </View>
    );
  }

  const entries = Object.entries(task).filter(
    ([, value]) => value !== undefined && value !== null && String(value).trim() !== ""
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: task["Tâche"] || "Détail tâche" }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{task["Tâche"]}</Text>
          <Text style={styles.heroSubtitle}>Toutes les informations de la tâche</Text>
        </View>

        <View style={styles.detailsCard}>
          {entries.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{String(value)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionsBar,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 20 : 16) },
        ]}
      >
        <Pressable style={styles.completeBtn} onPress={handleMarkComplete}>
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.actionText}>Marquer comme terminée</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Feather name="trash-2" size={18} color="#fff" />
          <Text style={styles.actionText}>Supprimer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: colors.light.primary,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.88)",
  },
  detailsCard: {
    backgroundColor: colors.light.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 14,
  },
  detailRow: {
    gap: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    lineHeight: 22,
  },
  actionsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.light.background,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    gap: 10,
  },
  completeBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteBtn: {
    backgroundColor: colors.light.destructive,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  emptyScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.light.background,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
