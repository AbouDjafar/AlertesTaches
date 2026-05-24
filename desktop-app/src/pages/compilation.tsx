import { useMemo, useRef, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, FolderUp, PieChart as PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { importJsonContent, saveExportFile } from "@/lib/backend";
import { exportCompiledWorkbook, type CompiledOwnerDataset } from "@/lib/excel";
import { getAlertLevel, getTaskStatusText, isTaskCompleted } from "@/lib/store";

type CompilationDataset = CompiledOwnerDataset & {
  fileName: string;
};

type DatasetSummary = {
  owner: string;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  alerts: number;
};

const CHART_COLORS = ["#60A5FA", "#F59E0B", "#34D399", "#F472B6", "#A78BFA", "#FB7185"];
const TOOLTIP_STYLE = {
  background: "#161B22",
  border: "1px solid #232A33",
  borderRadius: 12,
  color: "#F8FAFC",
};

function extractOwnerLabel(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
  const cleaned = baseName.replace(/_planificateur_taches_gantt_alertes\.json$/i, "");
  return cleaned.replace(/[_-]+/g, " ").trim() || "Utilisateur";
}

function safeRatio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

export default function Compilation() {
  const { toast } = useToast();
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [datasets, setDatasets] = useState<CompilationDataset[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const summaries = useMemo<DatasetSummary[]>(() => {
    const today = new Date();

    return datasets.map(({ owner, tasks }) => {
      const completed = tasks.filter((task) => isTaskCompleted(task)).length;
      const inProgress = tasks.filter((task) => getTaskStatusText(task).includes("cours")).length;
      const notStarted = tasks.filter((task) => getTaskStatusText(task).includes("non")).length;
      const overdue = tasks.filter((task) => {
        if (!task.dateFin || isTaskCompleted(task)) {
          return false;
        }
        const endDate = new Date(`${task.dateFin}T00:00:00`);
        return Number.isFinite(endDate.getTime()) && endDate < today;
      }).length;
      const alerts = tasks.filter((task) => {
        if (!task.dateFin || isTaskCompleted(task)) {
          return false;
        }
        const endDate = new Date(`${task.dateFin}T00:00:00`);
        if (!Number.isFinite(endDate.getTime())) {
          return false;
        }
        const diff = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
        return getAlertLevel(diff) !== null;
      }).length;

      return {
        owner,
        total: tasks.length,
        completed,
        inProgress,
        notStarted,
        overdue,
        alerts,
      };
    });
  }, [datasets]);

  const globalStats = useMemo(() => {
    return summaries.reduce(
      (accumulator, summary) => ({
        sources: accumulator.sources + 1,
        tasks: accumulator.tasks + summary.total,
        completed: accumulator.completed + summary.completed,
        inProgress: accumulator.inProgress + summary.inProgress,
        overdue: accumulator.overdue + summary.overdue,
        alerts: accumulator.alerts + summary.alerts,
      }),
      { sources: 0, tasks: 0, completed: 0, inProgress: 0, overdue: 0, alerts: 0 },
    );
  }, [summaries]);

  const priorityData = useMemo(() => {
    const priorityTotals = new Map<string, number>();
    datasets.forEach(({ tasks }) => {
      tasks.forEach((task) => {
        const key = task.priorite?.trim() || "Non renseignee";
        priorityTotals.set(key, (priorityTotals.get(key) ?? 0) + 1);
      });
    });

    return Array.from(priorityTotals.entries()).map(([name, value]) => ({ name, value }));
  }, [datasets]);

  const statusData = useMemo(() => ([
    { name: "Terminees", value: globalStats.completed, color: "#34D399" },
    { name: "En cours", value: globalStats.inProgress, color: "#F59E0B" },
    { name: "A demarrer", value: Math.max(globalStats.tasks - globalStats.completed - globalStats.inProgress, 0), color: "#60A5FA" },
    { name: "En retard", value: globalStats.overdue, color: "#FB7185" },
  ].filter((item) => item.value > 0)), [globalStats]);

  const ownerProgressData = useMemo(() => summaries.map((summary) => ({
    owner: summary.owner,
    Terminees: summary.completed,
    "En cours": summary.inProgress,
    "A demarrer": summary.notStarted,
  })), [summaries]);

  const loadCompilationFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsCompiling(true);
    try {
      const nextDatasets: CompilationDataset[] = [];
      let skipped = 0;

      for (const file of Array.from(files)) {
        if (!/_planificateur_taches_gantt_alertes\.json$/i.test(file.name)) {
          skipped += 1;
          continue;
        }

        const content = await file.text();
        const tasks = await importJsonContent(content);
        nextDatasets.push({
          owner: extractOwnerLabel((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name),
          fileName: file.name,
          tasks,
        });
      }

      nextDatasets.sort((left, right) => left.owner.localeCompare(right.owner, "fr", { sensitivity: "base" }));
      setDatasets(nextDatasets);

      toast({
        title: "Compilation prete",
        description: `${nextDatasets.length} source(s) chargee(s)${skipped > 0 ? `, ${skipped} fichier(s) ignore(s)` : ""}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Compilation impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleExportCompilation = async () => {
    if (datasets.length === 0) {
      toast({
        title: "Aucune donnee a exporter",
        description: "Charge d'abord un dossier ou plusieurs JSON compatibles.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const buffer = await exportCompiledWorkbook(datasets.map(({ owner, tasks }) => ({ owner, tasks })));
      await saveExportFile(
        `compilation_alertes_taches_${new Date().toISOString().slice(0, 10)}.xlsx`,
        Array.from(new Uint8Array(buffer)),
      );
      toast({
        title: "Compilation exportee",
        description: "Le classeur consolide a ete enregistre dans le dossier Exports Alertes Taches.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    { label: "Sources compilees", value: globalStats.sources, hint: "Fichiers JSON compatibles" },
    { label: "Total taches", value: globalStats.tasks, hint: "Toutes sources confondues" },
    { label: "Taux termine", value: `${safeRatio(globalStats.completed, globalStats.tasks)}%`, hint: `${globalStats.completed} tache(s)` },
    { label: "Alertes actives", value: globalStats.alerts, hint: `${globalStats.overdue} en retard` },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-[1280px] space-y-8 p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pilotage</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Compiler les donnees</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Charge un dossier de JSON `*_planificateur_taches_gantt_alertes.json`, regroupe les taches par responsable et visualise des KPI.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={directoryInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="hidden"
              onChange={(event) => {
                void loadCompilationFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              {...({ webkitdirectory: "", directory: "" } as unknown as Record<string, string>)}
            />
            <Button onClick={() => directoryInputRef.current?.click()} disabled={isCompiling} className="gap-2">
              <FolderUp className="h-4 w-4" />
              {isCompiling ? "Analyse..." : "Charger un dossier JSON"}
            </Button>
            <Button onClick={() => { void handleExportCompilation(); }} disabled={isExporting || datasets.length === 0} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {isExporting ? "Export..." : "Exporter la compilation"}
            </Button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Repartition par source</h2>
                <p className="text-sm text-muted-foreground">Volume de taches et alertes par responsable compile.</p>
              </div>
            </div>
            {summaries.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Charge au moins un dossier ou plusieurs JSON pour afficher les graphiques.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={summaries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#243042" />
                  <XAxis dataKey="owner" tick={{ fill: "#F8FAFC", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#F8FAFC", fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#E6EDF3" }} itemStyle={{ color: "#F8FAFC" }} />
                  <Legend wrapperStyle={{ color: "#F8FAFC" }} />
                  <Bar dataKey="total" name="Taches" radius={[8, 8, 0, 0]} fill="#60A5FA" />
                  <Bar dataKey="alerts" name="Alertes" radius={[8, 8, 0, 0]} fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Priorites globales</h2>
                <p className="text-sm text-muted-foreground">Repartition consolidee des niveaux de priorite.</p>
              </div>
            </div>
            {priorityData.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Les priorites apparaitront ici apres le chargement des fichiers.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={108} paddingAngle={4}>
                    {priorityData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#E6EDF3" }} itemStyle={{ color: "#F8FAFC" }} />
                  <Legend wrapperStyle={{ color: "#F8FAFC" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">Progression par source</h2>
              <p className="text-sm text-muted-foreground">Terminees, en cours et a demarrer pour chaque jeu de donnees compile.</p>
            </div>
            {ownerProgressData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Aucune serie disponible pour le moment.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ownerProgressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#243042" />
                  <XAxis dataKey="owner" tick={{ fill: "#F8FAFC", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#F8FAFC", fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#E6EDF3" }} itemStyle={{ color: "#F8FAFC" }} />
                  <Legend wrapperStyle={{ color: "#F8FAFC" }} />
                  <Bar dataKey="Terminees" stackId="state" fill="#34D399" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="En cours" stackId="state" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="A demarrer" stackId="state" fill="#60A5FA" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">Etat global</h2>
              <p className="text-sm text-muted-foreground">Synthese rapide de la situation consolidee.</p>
            </div>
            {statusData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Les indicateurs s'afficheront apres compilation.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={108} innerRadius={58} paddingAngle={4}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#E6EDF3" }} itemStyle={{ color: "#F8FAFC" }} />
                  <Legend wrapperStyle={{ color: "#F8FAFC" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Details des sources chargees</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chaque ligne correspond a un fichier JSON compatible selectionne pour la compilation.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {datasets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/30 p-6 text-sm text-muted-foreground">
                Aucun JSON compile pour l'instant.
              </div>
            ) : (
              datasets.map((dataset, index) => {
                const summary = summaries.find((entry) => entry.owner === dataset.owner);
                return (
                  <div key={`${dataset.owner}-${dataset.fileName}`} className="space-y-3 rounded-xl border border-border bg-background/40 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{dataset.owner}</p>
                        <p className="text-xs text-muted-foreground">{dataset.fileName}</p>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}22`, color: CHART_COLORS[index % CHART_COLORS.length] }}
                      >
                        {dataset.tasks.length} tache(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <p>Terminees: <span className="font-semibold text-foreground">{summary?.completed ?? 0}</span></p>
                      <p>En cours: <span className="font-semibold text-foreground">{summary?.inProgress ?? 0}</span></p>
                      <p>A demarrer: <span className="font-semibold text-foreground">{summary?.notStarted ?? 0}</span></p>
                      <p>Alertes: <span className="font-semibold text-foreground">{summary?.alerts ?? 0}</span></p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
