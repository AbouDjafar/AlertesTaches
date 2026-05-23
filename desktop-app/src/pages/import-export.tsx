import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, FileJson, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { Task } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

interface ImportedPayload {
  tasks: Task[];
  source: string;
  rowCount: number;
}

function fromPythonFormat(json: unknown): Task[] {
  if (typeof json !== "object" || json === null) throw new Error("Format invalide");
  // Internal format
  const data = json as Record<string, unknown>;
  if (Array.isArray(data.tasks)) {
    return (data.tasks as Task[]).map(t => ({ ...t, id: t.id || uuidv4() }));
  }
  // Python export format
  if (Array.isArray(data.planificateur)) {
    return (data.planificateur as Record<string, unknown>[]).map(row => ({
      id: uuidv4(),
      numero: Number(row["N°"] ?? 0),
      activite: String(row["Activité"] ?? ""),
      tache: String(row["Tâche"] ?? ""),
      description: String(row["Description"] ?? ""),
      source: String(row["Source"] ?? ""),
      nature: String(row["Nature"] ?? ""),
      extrantAttendu: String(row["Extrant attendu"] ?? ""),
      iov: String(row["IOV (Indicateur Objectivement Vérifiable)"] ?? ""),
      responsable: String(row["Responsable"] ?? ""),
      dateDebut: String(row["Date de début"] ?? ""),
      dateFin: String(row["Date de fin"] ?? ""),
      duree: Number(row["Durée (jours)"] ?? 0),
      priorite: String(row["Priorité"] ?? "Moyen"),
      etatAvancement: String(row["État d'avancement"] ?? "Non démarré"),
      extrantsObtenus: String(row["Extrants obtenus à date"] ?? ""),
      livrablesFournis: String(row["Livrables fournis"] ?? ""),
      observations: String(row["Observations"] ?? ""),
      etat: (row["Etat"] as string | null) ?? null,
    }));
  }
  throw new Error("Format non reconnu — attendu: { planificateur: [...] } ou { tasks: [...] }");
}

export default function ImportExport() {
  const { tasks, setTasks } = useTasks();
  const [preview, setPreview] = useState<ImportedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      setError("Seuls les fichiers .json sont acceptés.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const importedTasks = fromPythonFormat(json);
        setPreview({ tasks: importedTasks, source: file.name, rowCount: importedTasks.length });
        setError(null);
      } catch (err) {
        setError(String(err));
        setPreview(null);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const confirmImport = () => {
    if (!preview) return;
    setTasks(preview.tasks);
    toast({ title: "Import réussi", description: `${preview.rowCount} tâches importées depuis ${preview.source}.` });
    setPreview(null);
  };

  const handleExport = () => {
    const payload = {
      generated_at: new Date().toISOString().replace("T", "T").split(".")[0],
      source_file: "planificateur_taches_gantt_alertes.json",
      planificateur: tasks.map(t => ({
        "N°": t.numero,
        "Activité": t.activite,
        "Tâche": t.tache,
        "Description": t.description,
        "Source": t.source,
        "Nature": t.nature,
        "Extrant attendu": t.extrantAttendu,
        "IOV (Indicateur Objectivement Vérifiable)": t.iov,
        "Responsable": t.responsable,
        "Date de début": t.dateDebut,
        "Date de fin": t.dateFin,
        "Durée (jours)": t.duree,
        "Priorité": t.priorite,
        "État d'avancement": t.etatAvancement,
        "Extrants obtenus à date": t.extrantsObtenus,
        "Livrables fournis": t.livrablesFournis,
        "Observations": t.observations,
        "Etat": t.etat,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planificateur_taches_gantt_alertes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: `${tasks.length} tâches exportées.` });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-[800px] mx-auto">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Données</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Import / Export</h1>
          <p className="text-muted-foreground text-sm mt-1">Importez ou exportez vos tâches au format JSON compatible avec le planificateur.</p>
        </div>

        <div className="space-y-6">
          {/* Import zone */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Importer
            </h2>
            <div
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-white/2"}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              data-testid="dropzone-import"
            >
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              <motion.div animate={dragging ? { scale: 1.05 } : { scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <FileJson className="w-10 h-10 mx-auto text-primary/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">Glissez un fichier JSON ici</p>
                <p className="text-xs text-muted-foreground mt-1">ou cliquez pour choisir un fichier</p>
                <p className="text-xs text-muted-foreground mt-3 font-mono">Format attendu : planificateur JSON (Python ou natif)</p>
              </motion.div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 flex items-start gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </motion.div>
              )}
              {preview && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-bold">Aperçu — {preview.rowCount} tâche{preview.rowCount > 1 ? "s" : ""} détectée{preview.rowCount > 1 ? "s" : ""}</span>
                    </div>
                    <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
                    {preview.tasks.slice(0, 5).map((t, i) => (
                      <div key={i} className="text-xs text-muted-foreground font-mono flex gap-2">
                        <span className="text-emerald-400 shrink-0">#{t.numero}</span>
                        <span className="truncate">{t.tache}</span>
                        <span className="shrink-0 text-muted-foreground/50">{t.dateFin}</span>
                      </div>
                    ))}
                    {preview.rowCount > 5 && <p className="text-xs text-muted-foreground">...et {preview.rowCount - 5} de plus</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={confirmImport} className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-confirm-import">
                      Confirmer l'import
                    </Button>
                    <Button variant="outline" onClick={() => setPreview(null)}>Annuler</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Exporter
            </h2>
            <div className="flex items-center justify-between p-4 bg-background/50 border border-border rounded-xl">
              <div>
                <p className="text-sm font-semibold text-foreground">{tasks.length} tâche{tasks.length > 1 ? "s" : ""} à exporter</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">planificateur_taches_gantt_alertes.json</p>
              </div>
              <Button onClick={handleExport} variant="outline" className="gap-2" disabled={tasks.length === 0} data-testid="button-export-json">
                <Download className="w-4 h-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
