import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { Task, getAlertLevel, getPriorityRank, isTaskCompleted, normalizePriority } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskDialog } from "@/components/tasks/task-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SortField = "numero" | "tache" | "responsable" | "dateFin" | "priorite" | "etatAvancement";

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
    let result = tasks.filter((task) =>
      [task.tache, task.activite, task.responsable, task.description].join(" ").toLowerCase().includes(search.toLowerCase()),
    );

    if (statusFilter !== "all") {
      result = result.filter((task) => task.etatAvancement === statusFilter);
    }

    result = [...result].sort((left, right) => {
      let leftValue: string | number = left[sortField] ?? "";
      let rightValue: string | number = right[sortField] ?? "";

      if (sortField === "priorite") {
        leftValue = getPriorityRank(left.priorite);
        rightValue = getPriorityRank(right.priorite);
      }
      if (sortField === "numero") {
        leftValue = Number(left.numero);
        rightValue = Number(right.numero);
      }

      if (leftValue < rightValue) return sortAsc ? -1 : 1;
      if (leftValue > rightValue) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, search, sortField, sortAsc, statusFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((previous) => !previous);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="h-3 w-3 opacity-30" />;
    }
    return sortAsc ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  const openNew = () => {
    setEditTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleSave = (task: Task) => {
    if (editTask) {
      updateTask(task);
    } else {
      addTask(task);
    }
    setDialogOpen(false);
  };

  const getUrgency = (task: Task) => {
    if (!task.dateFin || isTaskCompleted(task)) return null;
    const days = differenceInDays(parseISO(task.dateFin), today);
    return getAlertLevel(days);
  };

  const statuses = ["all", "En cours", "Non démarré", "Terminé"];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-8 pb-4 pt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Gestion</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Tâches</h1>
          </div>
          <Button onClick={openNew} className="gap-2" data-testid="button-add-task">
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              data-testid="input-search-tasks"
            />
          </div>
          <div className="flex gap-1.5">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${statusFilter === status ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
                data-testid={`filter-status-${status}`}
              >
                {status === "all" ? "Tous" : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-8 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  { field: "numero" as SortField, label: "N°", width: "w-12" },
                  { field: "tache" as SortField, label: "Tâche", width: "" },
                  { field: "responsable" as SortField, label: "Responsable", width: "w-36" },
                  { field: "dateFin" as SortField, label: "Échéance", width: "w-28" },
                  { field: "priorite" as SortField, label: "Priorité", width: "w-24" },
                  { field: "etatAvancement" as SortField, label: "État", width: "w-36" },
                ].map((column) => (
                  <th
                    key={column.field}
                    className={`cursor-pointer select-none px-2 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground ${column.width}`}
                    onClick={() => toggleSort(column.field)}
                  >
                    <span className="flex items-center gap-1">
                      {column.label}
                      <SortIcon field={column.field} />
                    </span>
                  </th>
                ))}
                <th className="w-20 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((task, index) => {
                  const urgency = getUrgency(task);
                  const normalizedPriority = normalizePriority(task.priorite);

                  return (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: index * 0.02, type: "spring", stiffness: 300, damping: 25 }}
                      className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-card/80"
                      onClick={() => openEdit(task)}
                      data-testid={`row-task-${task.id}`}
                    >
                      <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{task.numero}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          {urgency && <div className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[urgency.color]}`} />}
                          <div>
                            <p className="leading-tight text-foreground font-semibold">{task.tache}</p>
                            {task.activite && <p className="mt-0.5 text-xs text-muted-foreground">{task.activite}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">{task.responsable || "—"}</td>
                      <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{task.dateFin || "—"}</td>
                      <td className="px-2 py-3">
                        {normalizedPriority && (
                          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[normalizedPriority] ?? ""}`}>
                            {normalizedPriority}
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[task.etatAvancement] ?? ""}`}>
                          {task.etatAvancement}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
                          <button
                            onClick={() => openEdit(task)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400" data-testid={`button-delete-task-${task.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
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
                                <AlertDialogAction onClick={() => deleteTask(task.id)} className="bg-rose-500 hover:bg-rose-600">
                                  Supprimer
                                </AlertDialogAction>
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
            <div className="py-16 text-center text-muted-foreground">
              <ListTodo className="mx-auto mb-3 h-10 w-10 opacity-30" />
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
