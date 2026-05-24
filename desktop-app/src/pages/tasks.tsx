import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { Task, getAlertLevel, isTaskCompleted } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskDialog } from "@/components/tasks/task-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

type SortField = "numero" | "tache" | "responsable" | "dateFin" | "priorite" | "etatAvancement";

const PRIORITY_ORDER: Record<string, number> = { "Élevé": 0, "Moyen": 1, "Faible": 2 };
const STATUS_COLORS: Record<string, string> = {
  "Terminé": "bg-green-500/15 text-green-400 border-green-500/30",
  "En cours": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Non démarré": "bg-slate-500/15 text-slate-400 border-slate-500/30",
};
const PRIORITY_COLORS: Record<string, string> = {
  "Élevé": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Moyen": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Faible": "bg-sky-500/15 text-sky-400 border-sky-500/30",
};
const URGENCY_DOT: Record<string, string> = {
  charcoal: "bg-slate-400",
  pink: "bg-pink-400",
  yellow: "bg-yellow-400",
  blue: "bg-sky-400",
  green: "bg-emerald-400",
};

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("numero");
  const [sortAsc, setSortAsc] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const today = new Date();

  const filtered = useMemo(() => {
    let result = tasks.filter(t =>
      [t.tache, t.activite, t.responsable, t.description].join(" ").toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") {
      result = result.filter(t => t.etatAvancement === statusFilter);
    }
    result = [...result].sort((a, b) => {
      let av: string | number = a[sortField] ?? "";
      let bv: string | number = b[sortField] ?? "";
      if (sortField === "priorite") { av = PRIORITY_ORDER[a.priorite] ?? 99; bv = PRIORITY_ORDER[b.priorite] ?? 99; }
      if (sortField === "numero") { av = Number(a.numero); bv = Number(b.numero); }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return result;
  }, [tasks, search, sortField, sortAsc, statusFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(p => !p);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const openNew = () => { setEditTask(null); setDialogOpen(true); };
  const openEdit = (t: Task) => { setEditTask(t); setDialogOpen(true); };
  const handleSave = (t: Task) => { if (editTask) updateTask(t); else addTask(t); setDialogOpen(false); };

  const getUrgency = (task: Task) => {
    if (!task.dateFin || isTaskCompleted(task)) return null;
    const d = differenceInDays(parseISO(task.dateFin), today);
    return getAlertLevel(d);
  };

  const statuses = ["all", "En cours", "Non démarré", "Terminé"];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-border">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Gestion</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Tâches</h1>
          </div>
          <Button onClick={openNew} className="gap-2" data-testid="button-add-task">
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </Button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-tasks"
            />
          </div>
          <div className="flex gap-1.5">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                data-testid={`filter-status-${s}`}
              >
                {s === "all" ? "Tous" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="px-8 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  { field: "numero" as SortField, label: "N°", w: "w-12" },
                  { field: "tache" as SortField, label: "Tâche", w: "" },
                  { field: "responsable" as SortField, label: "Responsable", w: "w-36" },
                  { field: "dateFin" as SortField, label: "Échéance", w: "w-28" },
                  { field: "priorite" as SortField, label: "Priorité", w: "w-24" },
                  { field: "etatAvancement" as SortField, label: "État", w: "w-36" },
                ].map(col => (
                  <th
                    key={col.field}
                    className={`text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground ${col.w}`}
                    onClick={() => toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">{col.label}<SortIcon field={col.field} /></span>
                  </th>
                ))}
                <th className="w-20 py-3 px-2" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((task, i) => {
                  const urgency = getUrgency(task);
                  return (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.02, type: "spring", stiffness: 300, damping: 25 }}
                      className="border-b border-border/50 hover:bg-card/80 cursor-pointer group transition-colors"
                      onClick={() => openEdit(task)}
                      data-testid={`row-task-${task.id}`}
                    >
                      <td className="py-3 px-2 text-muted-foreground font-mono text-xs">{task.numero}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {urgency && <div className={`w-2 h-2 rounded-full shrink-0 ${URGENCY_DOT[urgency.color]}`} />}
                          <div>
                            <p className="font-semibold text-foreground leading-tight">{task.tache}</p>
                            {task.activite && <p className="text-xs text-muted-foreground mt-0.5">{task.activite}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{task.responsable || "—"}</td>
                      <td className="py-3 px-2 text-xs font-mono text-muted-foreground">{task.dateFin || "—"}</td>
                      <td className="py-3 px-2">
                        {task.priorite && (
                          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priorite] ?? ""}`}>{task.priorite}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[task.etatAvancement] ?? ""}`}>{task.etatAvancement}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(task)}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors" data-testid={`button-delete-task-${task.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer la tâche ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. La tâche <strong>{task.tache}</strong> sera définitivement supprimée.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTask(task.id)} className="bg-rose-500 hover:bg-rose-600">Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune tâche trouvée</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editTask}
        onSave={handleSave}
        taskCount={tasks.length}
      />
    </div>
  );
}
