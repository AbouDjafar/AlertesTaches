import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  Linking,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: bottomPadding },
      ]}
    >
      <View style={styles.iconWrapper}>
        <Feather name="bell" size={40} color={colors.light.primary} />
      </View>

      <Text style={styles.title}>Alertes Tâches</Text>
      <Text style={styles.version}>Version 1.0.0</Text>

      <View style={styles.card}>
        <Text style={styles.description}>
          Application de suivi des tâches avec alertes visuelles basées sur les
          échéances. Lit le fichier JSON de planification stocké dans la mémoire
          interne du téléphone après autorisation du dossier par Android.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comment ça fonctionne</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Feather name="folder" size={16} color={colors.light.primary} />
            <Text style={styles.infoText}>
              Placez votre fichier JSON dans le dossier{" "}
              <Text style={styles.mono}>
                /storage/emulated/0/AlertesTaches/
              </Text>
              , puis sélectionnez ce dossier quand l'application demande l'accès.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Feather name="check" size={16} color={colors.light.primary} />
            <Text style={styles.infoText}>
              Cochez une tâche pour la marquer comme "Terminée" dans le fichier
              JSON
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Feather name="trash-2" size={16} color={colors.light.primary} />
            <Text style={styles.infoText}>
              Supprimez une tâche pour la retirer définitivement du fichier JSON
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Feather name="share-2" size={16} color={colors.light.primary} />
            <Text style={styles.infoText}>
              Partagez le fichier renommé en{" "}
              <Text style={styles.mono}>nomUtilisateur_fichier.json</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Code couleur des échéances</Text>
        <View style={styles.card}>
          {[
            {
              color: "#d6d8db",
              text: "#383d41",
              label: "Échéance dépassée ou aujourd'hui",
            },
            { color: "#f8d7da", text: "#721c24", label: "Demain" },
            { color: "#fff3cd", text: "#856404", label: "Dans 2 jours" },
            {
              color: "#cce5ff",
              text: "#004085",
              label: "Dans 3 à 7 jours",
            },
            {
              color: "#d4edda",
              text: "#155724",
              label: "Dans plus de 7 jours",
            },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: item.color, borderColor: item.text + "40" },
                  ]}
                />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Développeur</Text>
        <View style={styles.card}>
          <View style={styles.devHeader}>
            <View style={styles.devAvatar}>
              <Feather name="user" size={22} color={colors.light.primary} />
            </View>
            <View style={styles.devInfo}>
              <Text style={styles.devName}>Djafar</Text>
              <Text style={styles.devRole}>
                Cadre Informaticien au Centre de Réseaux des Filières de Croissance
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Feather
              name="map-pin"
              size={15}
              color={colors.light.mutedForeground}
            />
            <Text style={styles.devDetail}>Yaoundé - Cameroun</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Feather
              name="briefcase"
              size={15}
              color={colors.light.mutedForeground}
            />
            <Text style={styles.devDetail}>CRFC</Text>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={styles.infoRow}
            onPress={() => Linking.openURL("mailto:djafar@crfc.cm")}
          >
            <Feather
              name="mail"
              size={15}
              color={colors.light.primary}
            />
            <Text style={[styles.devDetail, styles.emailLink]}>
              djafar@crfc.cm
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.light.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 24,
  },
  section: {
    width: "100%",
    marginBottom: 20,
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
    width: "100%",
    gap: 0,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    lineHeight: 22,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    lineHeight: 20,
  },
  mono: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: colors.light.primary,
    backgroundColor: colors.light.primary + "10",
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  legendDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  devHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 10,
  },
  devAvatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.light.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  devInfo: {
    flex: 1,
  },
  devName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  devRole: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 17,
    marginTop: 2,
  },
  devDetail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  emailLink: {
    color: colors.light.primary,
    textDecorationLine: "underline",
  },
});
