import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { differenceInDays, format } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { fr } from "date-fns/locale/fr";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, Bell, TrendingUp } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { getAlertLevel, getTaskStatusText, isTaskCompleted } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

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
    const completed = tasks.filter(t => isTaskCompleted(t)).length;
    const inProgress = tasks.filter(t => getTaskStatusText(t).includes("cours")).length;
    const notStarted = tasks.filter(t => getTaskStatusText(t).includes("non")).length;
    const overdue = tasks.filter(t => {
      if (!t.dateFin || isTaskCompleted(t)) return false;
      return differenceInDays(parseISO(t.dateFin), today) < 0;
    }).length;
    const alerts = tasks.filter(t => {
      if (!t.dateFin || isTaskCompleted(t)) return false;
      const d = differenceInDays(parseISO(t.dateFin), today);
      return getAlertLevel(d) !== null;
    }).length;
    return { total, completed, inProgress, notStarted, overdue, alerts };
  }, [tasks]);

  const activeAlerts = useMemo(() => {
    return tasks
      .filter(t => {
        if (!t.dateFin || isTaskCompleted(t)) return false;
        const d = differenceInDays(parseISO(t.dateFin), today);
        return getAlertLevel(d) !== null;
      })
      .map(t => {
        const d = differenceInDays(parseISO(t.dateFin), today);
        return { task: t, days: d, level: getAlertLevel(d)! };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 8);
  }, [tasks]);

  const ganttData = useMemo(() => {
    return tasks
      .filter(t => t.dateDebut && t.dateFin)
      .slice(0, 10)
      .map(t => {
        const start = differenceInDays(parseISO(t.dateDebut), today);
        const end = differenceInDays(parseISO(t.dateFin), today);
        return {
          name: t.tache.length > 22 ? t.tache.slice(0, 22) + "…" : t.tache,
          start: Math.max(start, -30),
          duration: Math.max(end - Math.max(start, -30), 1),
          done: isTaskCompleted(t),
        };
      });
  }, [tasks]);

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
  const barColor = (entry: { done: boolean }) => entry.done ? "#4ade80" : "#6366f1";

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-[1200px] mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          {/* Header */}
          <motion.div variants={item} className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-1">Tableau de bord</p>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Vue d'ensemble</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {format(today, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </motion.div>

          {/* Stat cards */}
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-primary/40 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</p>
                </div>
              );
            })}
          </motion.div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Gantt mini chart */}
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Chronologie des tâches</h2>
              {ganttData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune tâche avec dates</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ganttData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#F8FAFC" }} tickFormatter={(v) => v === 0 ? "Auj." : `J${v > 0 ? "+" : ""}${v}`} />
                    <YAxis type="category" dataKey="name" tick={yAxisTick} width={110} />
                    <Tooltip
                      contentStyle={{ background: "#161B22", border: "1px solid #232A33", borderRadius: 8 }}
                      labelStyle={{ color: "#E6EDF3", fontSize: 12 }}
                      itemStyle={{ color: "#F8FAFC" }}
                      formatter={(val: number, _name: string, props) => {
                        const entry = props.payload as { start: number; duration: number; done: boolean };
                        return [`J${entry.start >= 0 ? "+" : ""}${entry.start} → J${entry.start + entry.duration > 0 ? "+" : ""}${entry.start + entry.duration}`, "Période"];
                      }}
                    />
                    <Bar dataKey="start" fill="transparent" stackId="a" />
                    <Bar dataKey="duration" stackId="a" radius={[0, 4, 4, 0]}>
                      {ganttData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={barColor(entry)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Active alerts */}
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Alertes actives
                {activeAlerts.length > 0 && (
                  <span className="ml-auto text-xs font-bold bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full">{activeAlerts.length}</span>
                )}
              </h2>
              {activeAlerts.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-green-400/40" />
                  <p className="text-sm">Aucune alerte — tout est sous contrôle</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.map(({ task, level }) => (
                    <motion.div
                      key={task.id}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`border-l-4 ${alertBorderColor[level.color]} bg-background/50 rounded-r-lg px-4 py-2.5 flex items-center justify-between`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{task.tache}</p>
                        <p className={`text-xs font-bold tracking-wider mt-0.5 ${alertTextColor[level.color]}`}>{level.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0 ml-4">{task.responsable || "—"}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
