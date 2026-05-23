import { useState, useEffect, useCallback } from "react";
import { Task, loadTasks, saveTasks } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";

export function useTasks() {
  const [tasks, setTasksState] = useState<Task[]>([]);

  useEffect(() => {
    setTasksState(loadTasks());
  }, []);

  const setTasks = useCallback((newTasks: Task[]) => {
    setTasksState(newTasks);
    saveTasks(newTasks);
  }, []);

  const addTask = useCallback((task: Task) => {
    const withId: Task = {
      ...task,
      id: task.id || uuidv4(),
      duree: task.duree || (task.dateDebut && task.dateFin
        ? Math.abs(differenceInDays(parseISO(task.dateFin), parseISO(task.dateDebut)))
        : 0),
    };
    setTasks([...tasks, withId]);
  }, [tasks, setTasks]);

  const updateTask = useCallback((updated: Task) => {
    setTasks(tasks.map(t => t.id === updated.id ? updated : t));
  }, [tasks, setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  }, [tasks, setTasks]);

  return { tasks, setTasks, addTask, updateTask, deleteTask };
}
