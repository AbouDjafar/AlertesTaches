import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { Task } from "@/utils/core";

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
}

export function AddTaskModal({ visible, onClose, onAdd }: AddTaskModalProps) {
  const [nom, setNom] = useState("");
  const [personne, setPersonne] = useState("");
  const [echeance, setEcheance] = useState("");
  const [duree, setDuree] = useState("");
  const [details, setDetails] = useState("");

  const resetForm = () => {
    setNom("");
    setPersonne("");
    setEcheance("");
    setDuree("");
    setDetails("");
  };

  const handleAdd = () => {
    if (!nom.trim()) {
      Alert.alert("Erreur", "Le nom de la tâche est requis");
      return;
    }
    if (!echeance.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(echeance.trim())) {
      Alert.alert("Erreur", "L'échéance doit être au format AAAA-MM-JJ");
      return;
    }
    if (!personne.trim()) {
      Alert.alert("Erreur", "Le nom de la personne est requis");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onAdd({
      nom: nom.trim(),
      personne: personne.trim(),
      echeance: echeance.trim(),
      duree: parseInt(duree, 10) || 1,
      details: details.trim(),
      terminee: false,
    });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nouvelle tâche</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={24} color={colors.light.foreground} />
          </Pressable>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Nom de la tâche"
            placeholderTextColor={colors.light.mutedForeground}
          />

          <Text style={styles.label}>Personne *</Text>
          <TextInput
            style={styles.input}
            value={personne}
            onChangeText={setPersonne}
            placeholder="Responsable"
            placeholderTextColor={colors.light.mutedForeground}
          />

          <Text style={styles.label}>Échéance * (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            value={echeance}
            onChangeText={setEcheance}
            placeholder="2026-04-20"
            placeholderTextColor={colors.light.mutedForeground}
            keyboardType={Platform.OS === "web" ? "default" : "numbers-and-punctuation"}
          />

          <Text style={styles.label}>Durée (jours)</Text>
          <TextInput
            style={styles.input}
            value={duree}
            onChangeText={setDuree}
            placeholder="1"
            placeholderTextColor={colors.light.mutedForeground}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Détails</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={details}
            onChangeText={setDetails}
            placeholder="Description de la tâche"
            placeholderTextColor={colors.light.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleAdd}
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "web" ? 67 + 20 : 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.light.card,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  textArea: {
    minHeight: 80,
  },
  addButton: {
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 40,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
