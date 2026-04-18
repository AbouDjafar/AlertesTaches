import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  PlanData,
  PlanTask,
  Settings,
  StorageError,
  filterActiveTasks,
  loadFromStorage,
  loadSettings,
  saveSettings,
  saveToStorage,
  sortTasksByDeadline,
} from "@/utils/core";

interface TaskContextType {
  planData: PlanData | null;
  jsonFilename: string | null;
  activeTasks: PlanTask[];
  settings: Settings;
  loading: boolean;
  error: StorageError;
  refreshData: () => Promise<void>;
  markComplete: (task: PlanTask) => Promise<boolean>;
  deleteTask: (task: PlanTask) => Promise<boolean>;
  updateSettings: (settings: Settings) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

function findTaskIndex(tasks: PlanTask[], task: PlanTask): number {
  return tasks.findIndex((entry) => entry === task);
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [jsonFilename, setJsonFilename] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<StorageError>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const [result, loadedSettings] = await Promise.all([
      loadFromStorage(),
      loadSettings(),
    ]);
    setPlanData(result.data);
    setJsonFilename(result.filename);
    setError(result.error);
    setSettings(loadedSettings);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const allTasks = planData?.planificateur ?? [];
  const activeTasks = sortTasksByDeadline(filterActiveTasks(allTasks));

  const markComplete = useCallback(
    async (task: PlanTask): Promise<boolean> => {
      if (!planData || !jsonFilename) return false;

      const taskIndex = findTaskIndex(planData.planificateur, task);
      if (taskIndex === -1) return false;

      const updatedPlan = [...planData.planificateur];
      updatedPlan[taskIndex] = {
        ...updatedPlan[taskIndex],
        "État d'avancement": "Terminé",
      };

      const updatedData = { ...planData, planificateur: updatedPlan };
      const saved = await saveToStorage(updatedData, jsonFilename);
      if (saved) {
        setPlanData(updatedData);
      }
      return saved;
    },
    [planData, jsonFilename]
  );

  const deleteTask = useCallback(
    async (task: PlanTask): Promise<boolean> => {
      if (!planData || !jsonFilename) return false;

      const taskIndex = findTaskIndex(planData.planificateur, task);
      if (taskIndex === -1) return false;

      const updatedPlan = planData.planificateur.filter(
        (_, index) => index !== taskIndex
      );

      const updatedData = { ...planData, planificateur: updatedPlan };
      const saved = await saveToStorage(updatedData, jsonFilename);
      if (saved) {
        setPlanData(updatedData);
      }
      return saved;
    },
    [planData, jsonFilename]
  );

  const updateSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, []);

  return (
    <TaskContext.Provider
      value={{
        planData,
        jsonFilename,
        activeTasks,
        settings,
        loading,
        error,
        refreshData,
        markComplete,
        deleteTask,
        updateSettings,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}
