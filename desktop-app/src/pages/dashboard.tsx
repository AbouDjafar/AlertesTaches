import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { addDays, differenceInDays, format } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { fr } from "date-fns/locale/fr";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, Bell, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { useTasks } from "@/hooks/use-tasks";
import { getAlertLevel, getTaskStatusText, isTaskCompleted } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

type TimelineEntry = {
  displayIndex: string;
  taskName: string;
  responsable: string;
  startLabel: string;
  endLabel: string;
  startOffset: number;
  duration: number;
  done: boolean;
};

type TimelineTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: TimelineEntry }>;
};

function TimelineTooltip({ active, payload }: TimelineTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-2xl">
      <p className="font-semibold text-foreground">Tâche {entry.displayIndex}</p>
      <p className="mt-1 text-sm text-foreground">{entry.taskName}</p>
      <p className="mt-2 text-xs text-muted-foreground">Du {entry.startLabel} au {entry.endLabel}</p>
      <p className="mt-1 text-xs text-muted-foreground">Durée : {entry.duration} jour{entry.duration > 1 ? "s" : ""}</p>
      <p className="mt-1 text-xs text-muted-foreground">Responsable : {entry.responsable || "—"}</p>
    </div>
  );
}

export default function Dashboard() {
  const { tasks } = useTasks();
  const today = new Date();

  const yAxisTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) => (
    <text x={x} y={y} dy={3} textAnchor="end" fill="#F8FAFC" fontSize={10}>
      {payload?.value ?? ""}
    </text>
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => isTaskCompleted(task)).length;
    const inProgress = tasks.filter((task) => getTaskStatusText(task).includes("cours")).length;
    const notStarted = tasks.filter((task) => getTaskStatusText(task).includes("non")).length;
    const overdue = tasks.filter((task) => {
      if (!task.dateFin || isTaskCompleted(task)) return false;
      return differenceInDays(parseISO(task.dateFin), today) < 0;
    }).length;
    const alerts = tasks.filter((task) => {
      if (!task.dateFin || isTaskCompleted(task)) return false;
      const days = differenceInDays(parseISO(task.dateFin), today);
      return getAlertLevel(days) !== null;
    }).length;
    return { total, completed, inProgress, notStarted, overdue, alerts };
  }, [tasks, today]);

  const activeAlerts = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.dateFin || isTaskCompleted(task)) return false;
        const days = differenceInDays(parseISO(task.dateFin), today);
        return getAlertLevel(days) !== null;
      })
      .map((task) => {
        const days = differenceInDays(parseISO(task.dateFin), today);
        return { task, days, level: getAlertLevel(days)! };
      })
      .sort((left, right) => left.days - right.days)
      .slice(0, 8);
  }, [tasks, today]);

  const timeline = useMemo(() => {
    const scheduledTasks = tasks
      .filter((task) => task.dateDebut && task.dateFin)
      .map((task) => {
        const startDate = parseISO(task.dateDebut);
        const endDate = parseISO(task.dateFin);
        return { task, startDate, endDate };
      })
      .filter(({ startDate, endDate }) => !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()))
      .sort((left, right) => {
        const startDiff = left.startDate.getTime() - right.startDate.getTime();
        if (startDiff !== 0) {
          return startDiff;
        }
        return left.endDate.getTime() - right.endDate.getTime();
      })
      .slice(0, 12);

    if (scheduledTasks.length === 0) {
      return {
        items: [] as TimelineEntry[],
        minStart: today,
        totalSpan: 1,
        todayOffset: 0,
      };
    }

    const minStart = scheduledTasks.reduce((current, item) => item.startDate < current ? item.startDate : current, scheduledTasks[0].startDate);
    const maxEnd = scheduledTasks.reduce((current, item) => item.endDate > current ? item.endDate : current, scheduledTasks[0].endDate);
    const totalSpan = Math.max(differenceInDays(maxEnd, minStart) + 1, 1);
    const todayOffset = differenceInDays(today, minStart);

    return {
      minStart,
      totalSpan,
      todayOffset,
      items: scheduledTasks.map(({ task, startDate, endDate }, index) => ({
        displayIndex: String(index + 1),
        taskName: task.tache,
        responsable: task.responsable,
        startLabel: format(startDate, "dd/MM/yy"),
        endLabel: format(endDate, "dd/MM/yy"),
        startOffset: Math.max(differenceInDays(startDate, minStart), 0),
        duration: Math.max(differenceInDays(endDate, startDate) + 1, 1),
        done: isTaskCompleted(task),
      })),
    };
  }, [tasks, today]);

  const statCards = [
    { label: "Total tâches", value: stats.total, icon: ListTodo, color: "text-primary", bg: "bg-primary/10" },
    { label: "En cours", value: stats.inProgress, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Terminées", value: stats.completed, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "En retard", value: stats.overdue, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10" },
    { label: "Alertes actives", value: stats.alerts, icon: Bell, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Non démarrées", value: stats.notStarted, icon: TrendingUp, color: "text-sky-400", bg: "bg-sky-400/10" },
  ];

  const alertBorderColor: Record<string, string> = {
    charcoal: "border-l-slate-500",
    pink: "border-l-pink-400",
    yellow: "border-l-yellow-400",
    blue: "border-l-sky-400",
    green: "border-l-emerald-400",
  };
  const alertTextColor: Record<string, string> = {
    charcoal: "text-slate-400",
    pink: "text-pink-400",
    yellow: "text-yellow-400",
    blue: "text-sky-400",
    green: "text-emerald-400",
  };
  const barColor = (entry: { done: boolean }) => entry.done ? "#4ADE80" : "#D84A3A";

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-[1200px] p-8">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          <motion.div variants={item} className="flex items-end justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Tableau de bord</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Vue d'ensemble</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(today, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold leading-none text-foreground">{card.value}</p>
                  <p className="text-xs font-medium leading-tight text-muted-foreground">{card.label}</p>
                </div>
              );
            })}
          </motion.div>

          <motion.div variants={item} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Chronologie des tâches</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lecture type Gantt : l'axe horizontal montre les dates, la longueur des barres montre la durée, et le nom complet apparaît au survol.
              </p>
            </div>

            {timeline.items.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Aucune tâche avec dates
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={timeline.items} layout="vertical" margin={{ top: 20, right: 24, bottom: 12, left: 0 }}>
                  <XAxis
                    type="number"
                    orientation="top"
                    domain={[0, timeline.totalSpan]}
                    tick={{ fontSize: 10, fill: "#F8FAFC" }}
                    tickFormatter={(value) => format(addDays(timeline.minStart, Number(value)), "dd/MM/yy")}
                  />
                  <YAxis type="category" dataKey="displayIndex" tick={yAxisTick} width={40} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<TimelineTooltip />} />
                  <ReferenceLine
                    x={Math.min(Math.max(timeline.todayOffset, 0), timeline.totalSpan)}
                    stroke="#FBBF24"
                    strokeDasharray="5 5"
                    label={{ value: "Auj.", position: "insideTopRight", fill: "#FBBF24", fontSize: 10 }}
                  />
                  <Bar dataKey="startOffset" fill="transparent" stackId="timeline" />
                  <Bar dataKey="duration" stackId="timeline" radius={[0, 6, 6, 0]}>
                    {timeline.items.map((entry, index) => (
                      <Cell key={`timeline-${index}`} fill={barColor(entry)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div variants={item} className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-foreground">
              <Bell className="h-4 w-4 text-amber-400" />
              Alertes actives
              {activeAlerts.length > 0 && (
                <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-400">{activeAlerts.length}</span>
              )}
            </h2>
            {activeAlerts.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-400/40" />
                <p className="text-sm">Aucune alerte, tout est sous contrôle</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map(({ task, level }) => (
                  <motion.div
                    key={task.id}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex items-center justify-between rounded-r-lg border-l-4 bg-background/50 px-4 py-2.5 ${alertBorderColor[level.color]}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{task.tache}</p>
                      <p className={`mt-0.5 text-xs font-bold tracking-wider ${alertTextColor[level.color]}`}>{level.label}</p>
                    </div>
                    <p className="ml-4 shrink-0 text-xs text-muted-foreground">{task.responsable || "—"}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
