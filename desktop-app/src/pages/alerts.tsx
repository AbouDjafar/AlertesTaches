import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { Bell, CheckCircle2 } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { getAlertLevel } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AlertItem {
  id: string;
  tache: string;
  description: string;
  responsable: string;
  dateFin: string;
  days: number;
  color: string;
  label: string;
  palette: { surface: string; accent: string };
}

const PALETTE_MAP: Record<string, { bg: string; border: string; label: string; badge: string; icon: string }> = {
  charcoal: {
    bg: "bg-slate-800/60",
    border: "border-slate-600/50",
    label: "text-slate-300",
    badge: "bg-slate-700 text-slate-300",
    icon: "text-slate-400",
  },
  pink: {
    bg: "bg-pink-950/40",
    border: "border-pink-700/50",
    label: "text-pink-300",
    badge: "bg-pink-900/60 text-pink-300",
    icon: "text-pink-400",
  },
  yellow: {
    bg: "bg-yellow-950/40",
    border: "border-yellow-700/50",
    label: "text-yellow-300",
    badge: "bg-yellow-900/60 text-yellow-300",
    icon: "text-yellow-400",
  },
  blue: {
    bg: "bg-sky-950/40",
    border: "border-sky-700/50",
    label: "text-sky-300",
    badge: "bg-sky-900/60 text-sky-300",
    icon: "text-sky-400",
  },
  green: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-700/50",
    label: "text-emerald-300",
    badge: "bg-emerald-900/60 text-emerald-300",
    icon: "text-emerald-400",
  },
};

const SECTION_ORDER = ["charcoal", "pink", "yellow", "blue", "green"];
const SECTION_TITLES: Record<string, string> = {
  charcoal: "En retard / Aujourd'hui",
  pink: "Demain",
  yellow: "Dans 2 jours",
  blue: "Cette semaine (3-7 jours)",
  green: "Plus d'une semaine",
};

export default function Alerts() {
  const { tasks } = useTasks();
  const today = new Date();

  const alertsByColor = useMemo(() => {
    const groups: Record<string, AlertItem[]> = {};
    for (const t of tasks) {
      if (!t.dateFin || t.etatAvancement.toLowerCase().includes("termin")) continue;
      const d = differenceInDays(parseISO(t.dateFin), today);
      const level = getAlertLevel(d);
      if (!level) continue;
      if (!groups[level.color]) groups[level.color] = [];
      groups[level.color].push({
        id: t.id,
        tache: t.tache,
        description: t.description,
        responsable: t.responsable,
        dateFin: t.dateFin,
        days: d,
        color: level.color,
        label: level.label,
        palette: level.palette,
      });
    }
    for (const g of Object.values(groups)) {
      g.sort((a, b) => a.days - b.days);
    }
    return groups;
  }, [tasks]);

  const total = Object.values(alertsByColor).reduce((s, g) => s + g.length, 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-[1100px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Surveillance</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              Centre d'alertes
              {total > 0 && (
                <span className="text-sm font-bold bg-amber-400/15 text-amber-400 px-2.5 py-1 rounded-full border border-amber-400/20">
                  {total} alerte{total > 1 ? "s" : ""}
                </span>
              )}
            </h1>
          </div>
        </div>

        {total === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground"
          >
            <CheckCircle2 className="w-16 h-16 text-green-400/30" />
            <p className="text-lg font-semibold">Aucune alerte active</p>
            <p className="text-sm">Toutes les tâches sont sous contrôle ou terminées.</p>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {SECTION_ORDER.map(color => {
              const group = alertsByColor[color];
              if (!group?.length) return null;
              const styles = PALETTE_MAP[color];
              return (
                <div key={color}>
                  <h2 className={`text-xs font-bold tracking-widest uppercase mb-3 ${styles.label}`}>
                    {SECTION_TITLES[color]}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${styles.badge}`}>{group.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {group.map((alert, i) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, y: 16, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
                          whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                          className={`${styles.bg} border ${styles.border} rounded-2xl p-5 cursor-default shadow-lg`}
                          data-testid={`alert-card-${alert.id}`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${styles.icon}`} />
                            <div className="min-w-0">
                              <p className={`text-xs font-bold tracking-widest uppercase ${styles.label}`}>{alert.label}</p>
                              <p className="text-base font-bold text-foreground leading-tight mt-1">{alert.tache}</p>
                            </div>
                          </div>
                          {alert.description && alert.description !== "" && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{alert.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t border-white/5">
                            <span className="text-muted-foreground font-medium">{alert.responsable || "—"}</span>
                            <span className="font-mono text-muted-foreground">{alert.dateFin}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
