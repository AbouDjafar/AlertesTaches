import { useRef, useState } from "react";
import { Download, FileJson, FileSpreadsheet, Smartphone, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTasks } from "@/hooks/use-tasks";
import { exportJsonContent, importJsonContent, syncFromPhone, syncToPhone } from "@/lib/backend";
import { exportTasksToExcel, importTasksFromExcel } from "@/lib/excel";

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ImportExport() {
  const { tasks, setTasks } = useTasks();
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleJsonImport = async (file: File) => {
    setIsBusy("json-import");
    try {
      const content = await file.text();
      const importedTasks = await importJsonContent(content);
      setTasks(importedTasks);
      toast({
        title: "Import JSON réussi",
        description: `${importedTasks.length} tâche(s) importée(s) depuis ${file.name}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Import JSON impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  const handleExcelImport = async (file: File) => {
    setIsBusy("excel-import");
    try {
      const importedTasks = await importTasksFromExcel(file);
      setTasks(importedTasks);
      toast({
        title: "Import Excel réussi",
        description: `${importedTasks.length} tâche(s) importée(s) depuis ${file.name}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Import Excel impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  const handleJsonExport = async () => {
    setIsBusy("json-export");
    try {
      const content = await exportJsonContent();
      triggerDownload(
        new Blob([content], { type: "application/json" }),
        `planificateur_taches_gantt_alertes_${new Date().toISOString().slice(0, 10)}.json`,
      );
      toast({
        title: "Export JSON réussi",
        description: `${tasks.length} tâche(s) exportée(s).`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export JSON impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  const handleExcelExport = async () => {
    setIsBusy("excel-export");
    try {
      const buffer = await exportTasksToExcel(tasks);
      triggerDownload(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "planificateur_taches_gantt_alertes.xlsx",
      );
      toast({
        title: "Export Excel réussi",
        description: "Le classeur compatible avec le template de référence a été généré.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Excel impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  const handlePhonePush = async () => {
    setIsBusy("phone-push");
    try {
      const output = await syncToPhone();
      toast({
        title: "Téléphone mis à jour",
        description: output || "Le JSON a été copié vers le téléphone.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Synchronisation impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  const handlePhonePull = async () => {
    setIsBusy("phone-pull");
    try {
      const data = await syncFromPhone();
      setTasks(data.tasks);
      toast({
        title: "Données récupérées",
        description: `${data.tasks.length} tâche(s) importée(s) depuis le téléphone.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Récupération impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-[980px] mx-auto space-y-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Données</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Import / Export</h1>
          <p className="text-muted-foreground text-sm mt-1">
            JSON interne, classeur Excel compatible et synchronisation téléphone sur la logique métier de référence.
          </p>
        </div>

        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleJsonImport(file);
            }
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleExcelImport(file);
            }
            event.currentTarget.value = "";
          }}
        />

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">JSON compatible Python</h2>
                <p className="text-sm text-muted-foreground">Import ou export du format `planificateur_taches_gantt_alertes.json`.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => jsonInputRef.current?.click()} disabled={isBusy !== null} className="gap-2">
                <Upload className="w-4 h-4" />
                {isBusy === "json-import" ? "Import..." : "Importer JSON"}
              </Button>
              <Button onClick={() => { void handleJsonExport(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {isBusy === "json-export" ? "Export..." : "Exporter JSON"}
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Classeur Excel</h2>
                <p className="text-sm text-muted-foreground">Import ou export avec feuille `Planificateur`, `Gantt`, largeurs, validations et formules.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => excelInputRef.current?.click()} disabled={isBusy !== null} className="gap-2">
                <Upload className="w-4 h-4" />
                {isBusy === "excel-import" ? "Import..." : "Importer Excel"}
              </Button>
              <Button onClick={() => { void handleExcelExport(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {isBusy === "excel-export" ? "Export..." : "Exporter Excel"}
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Synchronisation téléphone</h2>
              <p className="text-sm text-muted-foreground">
                Utilise la logique MTP Windows portée depuis les scripts PowerShell de référence, sans dépendance Python.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => { void handlePhonePush(); }} disabled={isBusy !== null} className="gap-2">
              <Upload className="w-4 h-4" />
              {isBusy === "phone-push" ? "Envoi..." : "Mettre à jour le téléphone"}
            </Button>
            <Button onClick={() => { void handlePhonePull(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              {isBusy === "phone-pull" ? "Récupération..." : "Mettre à jour le PC"}
            </Button>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
