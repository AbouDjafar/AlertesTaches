import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { v4 as uuidv4 } from "uuid";
import { loadAppData, saveAllTasks } from "@/lib/backend";
import { clearLegacyTasks, readLegacyTasks, type Task } from "@/lib/store";

type TasksContextValue = {
  tasks: Task[];
  setTasks: (nextTasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  isLoading: boolean;
};

const TasksContext = createContext<TasksContextValue | null>(null);

function withComputedDuration(task: Task) {
  return {
    ...task,
    duree: task.duree || (task.dateDebut && task.dateFin
      ? Math.abs(differenceInDays(parseISO(task.dateFin), parseISO(task.dateDebut)))
      : 0),
  };
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const data = await loadAppData();
        let nextTasks = data.tasks ?? [];

        if (nextTasks.length === 0) {
          const legacyTasks = readLegacyTasks();
          if (legacyTasks.length > 0) {
            nextTasks = legacyTasks.map(withComputedDuration);
            await saveAllTasks(nextTasks);
            clearLegacyTasks();
          }
        }

        if (!cancelled) {
          setTasksState(nextTasks.map(withComputedDuration));
        }
      } catch (error) {
        console.error("Unable to load desktop tasks", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTasks = useCallback((nextTasks: Task[]) => {
    const normalizedTasks = nextTasks.map(withComputedDuration);
    setTasksState(normalizedTasks);
    void saveAllTasks(normalizedTasks).catch((error) => {
      console.error("Unable to persist desktop tasks", error);
    });
  }, []);

  const setTasks = useCallback((nextTasks: Task[]) => {
    persistTasks(nextTasks);
  }, [persistTasks]);

  const addTask = useCallback((task: Task) => {
    const nextTask = withComputedDuration({
      ...task,
      id: task.id || uuidv4(),
    });
    persistTasks([...tasks, nextTask]);
  }, [persistTasks, tasks]);

  const updateTask = useCallback((updated: Task) => {
    persistTasks(tasks.map((task) => (
      task.id === updated.id ? withComputedDuration(updated) : task
    )));
  }, [persistTasks, tasks]);

  const deleteTask = useCallback((id: string) => {
    persistTasks(tasks.filter((task) => task.id !== id));
  }, [persistTasks, tasks]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    isLoading,
  }), [addTask, deleteTask, isLoading, setTasks, tasks, updateTask]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider.");
  }
  return context;
}
