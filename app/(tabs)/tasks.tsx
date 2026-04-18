import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TaskCard } from "@/components/TaskCard";
import { useTasks } from "@/context/TaskContext";
import colors from "@/constants/colors";

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { planData, activeTasks, loading, error, refreshData } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (error === "web") {
      return (
        <EmptyState
          icon="monitor"
          title="Non disponible"
          message="La lecture depuis la mémoire interne n'est pas disponible dans un navigateur web."
        />
      );
    }
    if (error === "ios") {
      return (
        <EmptyState
          icon="smartphone"
          title="Android requis"
          message="Cette application est conçue pour Android. Placez votre fichier JSON dans /storage/emulated/0/AlertesTaches/"
        />
      );
    }
    if (error === "permission_denied") {
      return (
        <EmptyState
          icon="lock"
          title="Permission refusée"
          message="L'accès au dossier a été refusé. Appuyez sur Réessayer puis sélectionnez le dossier AlertesTaches dans le sélecteur Android."
          onAction={refreshData}
          actionLabel="Réessayer"
        />
      );
    }
    if (error === "no_folder" || error === "no_file") {
      return (
        <EmptyState
          icon="folder"
          title="Aucun fichier trouvé"
          message="Aucun fichier JSON trouvé. Placez votre fichier dans le dossier AlertesTaches, puis sélectionnez ce dossier quand Android le demande."
          onAction={refreshData}
          actionLabel="Choisir / actualiser"
        />
      );
    }
    if (error === "invalid_format") {
      return (
        <EmptyState
          icon="alert-triangle"
          title="Format JSON invalide"
          message="Le fichier JSON a été trouvé, mais son contenu n'a pas le format attendu."
          onAction={refreshData}
          actionLabel="Réessayer"
        />
      );
    }
    if (error === "read_error") {
      return (
        <EmptyState
          icon="alert-circle"
          title="Lecture impossible"
          message="Android bloque encore la lecture. Réessayez et sélectionnez directement le dossier AlertesTaches."
          onAction={refreshData}
          actionLabel="Choisir le dossier"
        />
      );
    }
    return (
      <EmptyState
        icon="check-circle"
        title="Aucune tâche active"
        message="Toutes les tâches sont terminées ou le fichier est vide."
        onAction={refreshData}
        actionLabel="Actualiser"
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mes tâches</Text>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <Feather name="refresh-cw" size={18} color={colors.light.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Lecture du fichier JSON…</Text>
        </View>
      ) : (
        <FlatList
          data={activeTasks}
          keyExtractor={(item, idx) => `${item["N°"]}-${item["Tâche"]}-${idx}`}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => {
                const storageIndex =
                  planData?.planificateur.findIndex((entry) => entry === item) ?? -1;
                router.push(`/task/${storageIndex}` as never);
              }}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            activeTasks.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.primary]}
            />
          }
        />
      )}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
  onAction,
  actionLabel,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrapper}>
        <Feather name={icon} size={40} color={colors.light.mutedForeground} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.message}>{message}</Text>
      {onAction && actionLabel && (
        <Pressable style={emptyStyles.btn} onPress={onAction}>
          <Text style={emptyStyles.btnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: `${colors.light.primary}15`,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    minHeight: 400,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
    paddingTop: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.light.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
    lineHeight: 21,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
