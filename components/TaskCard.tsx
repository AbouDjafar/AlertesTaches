import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PlanTask, getDaysRemaining, getTaskColor } from "@/utils/core";

interface TaskCardProps {
  task: PlanTask;
  onPress?: () => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  const daysRemaining = getDaysRemaining(task["Date de fin"]);
  const color = getTaskColor(daysRemaining);

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: color.bg, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: color.text }]} numberOfLines={2}>
            {task["Tâche"]}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${color.text}20` }]}>
            <Text style={[styles.badgeText, { color: color.text }]}>
              {color.label}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={color.text} />
      </View>

      <View style={styles.infoGrid}>
        <InfoRow
          icon="calendar"
          label="Échéance"
          value={task["Date de fin"] || "—"}
          color={color.text}
        />
        <InfoRow
          icon="clock"
          label="Durée"
          value={`${task["Durée (jours)"] ?? "—"} j`}
          color={color.text}
        />
        <InfoRow
          icon="activity"
          label="Avancement"
          value={task["État d'avancement"] || "—"}
          color={color.text}
        />
      </View>
    </Pressable>
  );
}

function InfoRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Feather name={icon} size={13} color={color} />
      <Text style={[styles.infoLabel, { color }]}>{label}</Text>
      <Text style={[styles.infoValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  titleSection: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    opacity: 0.75,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
