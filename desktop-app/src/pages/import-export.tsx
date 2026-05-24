import { useRef, useState } from "react";
import { Link } from "wouter";
import { Download, FileJson, FileSpreadsheet, FileText, Smartphone, Upload } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTasks } from "@/hooks/use-tasks";
import { exportJsonContent, importJsonContent, saveExportFile, syncFromPhone, syncToPhone } from "@/lib/backend";
import { exportTasksToExcel, importTasksFromExcel } from "@/lib/excel";

export default function ImportExport() {
  const { tasks, setTasks } = useTasks();
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const saveBytesToExports = async (fileName: string, bytes: Uint8Array) => {
    return saveExportFile(fileName, Array.from(bytes));
  };

  const handleJsonImport = async (file: File) => {
    setIsBusy("json-import");
    try {
      const content = await file.text();
      const importedTasks = await importJsonContent(content);
      setTasks(importedTasks);
      toast({
        title: "Import JSON reussi",
        description: `${importedTasks.length} tache(s) importee(s) depuis ${file.name}.`,
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
        title: "Import Excel reussi",
        description: `${importedTasks.length} tache(s) importee(s) depuis ${file.name}.`,
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
      const fileName = `planificateur_taches_gantt_alertes_${new Date().toISOString().slice(0, 10)}.json`;
      await saveBytesToExports(fileName, new TextEncoder().encode(content));
      toast({
        title: "Export JSON reussi",
        description: `${tasks.length} tache(s) exportee(s) dans le dossier Exports Alertes Taches.`,
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
      await saveBytesToExports("planificateur_taches_gantt_alertes.xlsx", new Uint8Array(buffer));
      toast({
        title: "Export Excel reussi",
        description: "Le classeur compatible a ete genere dans le dossier Exports Alertes Taches.",
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

  const handlePdfExport = async () => {
    setIsBusy("pdf-export");
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      let currentY = 48;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Alertes Taches - Rapport PDF", 40, currentY);
      currentY += 24;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Date d'export : ${new Date().toLocaleString("fr-FR")}`, 40, currentY);
      currentY += 18;
      pdf.text(`Nombre total de taches : ${tasks.length}`, 40, currentY);
      currentY += 24;

      tasks.slice(0, 40).forEach((task, index) => {
        if (currentY > 760) {
          pdf.addPage();
          currentY = 48;
        }

        pdf.setFont("helvetica", "bold");
        pdf.text(`${index + 1}. ${task.tache || "Tache sans titre"}`, 40, currentY, { maxWidth: pageWidth - 80 });
        currentY += 14;

        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(
          `Activite: ${task.activite || "-"} | Responsable: ${task.responsable || "-"} | Etat: ${task.etatAvancement || "-"} | Fin: ${task.dateFin || "-"}`,
          pageWidth - 80,
        );
        pdf.text(lines, 40, currentY);
        currentY += (lines.length * 12) + 10;
      });

      await saveBytesToExports(
        `rapport_alertes_taches_${new Date().toISOString().slice(0, 10)}.pdf`,
        new Uint8Array(pdf.output("arraybuffer")),
      );

      toast({
        title: "Export PDF reussi",
        description: "Le rapport PDF a ete enregistre dans le dossier Exports Alertes Taches.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export PDF impossible",
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
        title: "Telephone mis a jour",
        description: output || "Le JSON a ete copie vers le telephone.",
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
        title: "Donnees recuperees",
        description: `${data.tasks.length} tache(s) importee(s) depuis le telephone.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Recuperation impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsBusy(null);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-[980px] space-y-6 p-8">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Donnees</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Import / Export</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            JSON interne, classeur Excel compatible, export PDF et synchronisation telephone sur la logique metier de reference.
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

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FileJson className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">JSON compatible Python</h2>
                <p className="text-sm text-muted-foreground">
                  Import ou export du format `planificateur_taches_gantt_alertes.json`.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => jsonInputRef.current?.click()} disabled={isBusy !== null} className="gap-2">
                <Upload className="h-4 w-4" />
                {isBusy === "json-import" ? "Import..." : "Importer JSON"}
              </Button>
              <Button onClick={() => { void handleJsonExport(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {isBusy === "json-export" ? "Export..." : "Exporter JSON"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Rapport PDF</h2>
                <p className="text-sm text-muted-foreground">
                  Genere un recapitulatif PDF dans `Exports Alertes Taches`, puis ouvre l&apos;explorateur sur ce dossier.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => { void handlePdfExport(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {isBusy === "pdf-export" ? "Export..." : "Exporter PDF"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Compiler les donnees</h2>
              <p className="text-sm text-muted-foreground">
                Ouvre la page dediee a la compilation multi-JSON avec KPI, graphiques et export Excel consolide.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/compilation">
              <FileSpreadsheet className="h-4 w-4" />
              Ouvrir la page Compilation
            </Link>
          </Button>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Classeur Excel</h2>
                <p className="text-sm text-muted-foreground">
                  Import ou export avec feuilles `Planificateur`, `Gantt`, validations et formules.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => excelInputRef.current?.click()} disabled={isBusy !== null} className="gap-2">
                <Upload className="h-4 w-4" />
                {isBusy === "excel-import" ? "Import..." : "Importer Excel"}
              </Button>
              <Button onClick={() => { void handleExcelExport(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {isBusy === "excel-export" ? "Export..." : "Exporter Excel"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Synchronisation telephone</h2>
                <p className="text-sm text-muted-foreground">
                  Utilise la logique MTP Windows portee depuis les scripts PowerShell de reference, sans dependance Python.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => { void handlePhonePush(); }} disabled={isBusy !== null} className="gap-2">
                <Upload className="h-4 w-4" />
                {isBusy === "phone-push" ? "Envoi..." : "Mettre a jour le telephone"}
              </Button>
              <Button onClick={() => { void handlePhonePull(); }} disabled={isBusy !== null} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {isBusy === "phone-pull" ? "Recuperation..." : "Mettre a jour le PC"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
