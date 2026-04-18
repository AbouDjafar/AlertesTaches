import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  PlanTask,
  groupTasksByDeadline,
  filterActiveTasks,
  Settings,
} from "./core";

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleGroupedNotifications(
  tasks: PlanTask[],
  settings: Settings
): Promise<number> {
  if (Platform.OS === "web") return 0;

  const granted = await checkNotificationPermission();
  if (!granted) return 0;

  await cancelAllNotifications();

  const active = filterActiveTasks(tasks);
  if (active.length === 0) return 0;

  const groups = groupTasksByDeadline(active);
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a - b);

  const { notificationHour, notificationMinute } = settings;
  let scheduled = 0;

  for (const days of sortedKeys) {
    const groupTasks = groups.get(days)!;
    const count = groupTasks.length;

    let body = "";
    if (days < 0) {
      body = `${count} tâche(s) en retard de ${Math.abs(days)} jour(s) !`;
    } else if (days === 0) {
      body = `${count} tâche(s) arrivent à échéance aujourd'hui !`;
    } else if (days === 1) {
      body = `${count} tâche(s) arrivent à échéance demain`;
    } else {
      body = `${count} tâche(s) arrivent à échéance dans ${days} jours`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Alertes Tâches",
        body,
        data: { screen: "tasks", days },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: notificationHour,
        minute: notificationMinute,
      },
    });
    scheduled++;
  }

  return scheduled;
}
