import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTasks } from "@/context/TaskContext";
import {
  requestNotificationPermission,
  checkNotificationPermission,
  scheduleGroupedNotifications,
  cancelAllNotifications,
} from "@/utils/notifications";
import colors from "@/constants/colors";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, activeTasks } = useTasks();
  const [username, setUsername] = useState(settings.username);
  const [hour, setHour] = useState(String(settings.notificationHour));
  const [minute, setMinute] = useState(
    String(settings.notificationMinute).padStart(2, "0")
  );
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  useEffect(() => {
    setUsername(settings.username);
    setHour(String(settings.notificationHour));
    setMinute(String(settings.notificationMinute).padStart(2, "0"));
  }, [settings]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkNotificationPermission().then(setNotifEnabled);
    }
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Non disponible",
        "Les notifications ne sont pas disponibles sur le web"
      );
      return;
    }

    if (value) {
      const granted = await requestNotificationPermission();
      if (granted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNotifEnabled(true);
        const count = await scheduleGroupedNotifications(activeTasks, settings);
        setScheduledCount(count);
        Alert.alert(
          "Notifications activées",
          `${count} groupe(s) de notifications programmés à ${settings.notificationHour}h${String(settings.notificationMinute).padStart(2, "0")}`
        );
      } else {
        Alert.alert(
          "Permission refusée",
          "Autorisez les notifications dans les réglages de votre appareil"
        );
      }
    } else {
      await cancelAllNotifications();
      setNotifEnabled(false);
      setScheduledCount(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = async () => {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    if (isNaN(h) || h < 0 || h > 23) {
      Alert.alert("Erreur", "L'heure doit être entre 0 et 23");
      return;
    }
    if (isNaN(m) || m < 0 || m > 59) {
      Alert.alert("Erreur", "Les minutes doivent être entre 0 et 59");
      return;
    }

    const newSettings = {
      username: username.trim() || "utilisateur",
      notificationHour: h,
      notificationMinute: m,
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSettings(newSettings);

    if (notifEnabled && Platform.OS !== "web") {
      const count = await scheduleGroupedNotifications(activeTasks, newSettings);
      setScheduledCount(count);
      Alert.alert(
        "Sauvegardé",
        `Réglages mis à jour. ${count} notification(s) programmée(s) à ${h}h${String(m).padStart(2, "0")}`
      );
    } else {
      Alert.alert("Sauvegardé", "Vos réglages ont été mis à jour");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Feather name="user" size={20} color={colors.light.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Nom d'utilisateur</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="utilisateur"
                placeholderTextColor={colors.light.mutedForeground}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Feather name="bell" size={20} color={colors.light.primary} />
              <View>
                <Text style={styles.fieldLabel}>Activer les alertes</Text>
                <Text style={styles.fieldHint}>
                  {Platform.OS === "web"
                    ? "Non disponible sur web"
                    : notifEnabled && scheduledCount > 0
                    ? `${scheduledCount} groupe(s) programmé(s)`
                    : "Groupées par échéance"}
                </Text>
              </View>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{
                false: colors.light.muted,
                true: colors.light.primary + "80",
              }}
              thumbColor={notifEnabled ? colors.light.primary : colors.light.mutedForeground}
              disabled={Platform.OS === "web"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Feather name="clock" size={20} color={colors.light.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Heure de notification</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={hour}
                  onChangeText={setHour}
                  placeholder="8"
                  placeholderTextColor={colors.light.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={minute}
                  onChangeText={setMinute}
                  placeholder="00"
                  placeholderTextColor={colors.light.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        </View>

        {notifEnabled && Platform.OS !== "web" && (
          <View style={styles.infoBox}>
            <Feather name="info" size={14} color={colors.light.primary} />
            <Text style={styles.infoText}>
              Une notification par groupe de tâches à la même échéance.
              Cliquez sur une notification pour ouvrir la liste des tâches.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          pressed && { opacity: 0.85 },
        ]}
        onPress={handleSave}
      >
        <Feather name="save" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>Sauvegarder</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: 14,
  },
  fieldContent: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  input: {
    backgroundColor: colors.light.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    width: 60,
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  saveButton: {
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    backgroundColor: colors.light.primary + "10",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.primary + "25",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    lineHeight: 18,
  },
});
