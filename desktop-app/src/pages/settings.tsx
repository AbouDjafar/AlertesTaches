import { useMemo, useState } from "react";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { BellRing, Eye, FileText, Settings2, UserRound } from "lucide-react";
import packageInfo from "../../package.json";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { useTasks } from "@/hooks/use-tasks";
import { previewStickyAlerts } from "@/lib/backend";
import { getAlertLevel, isTaskCompleted, type StickyNotePayload } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { StickyNoteCard } from "@/components/sticky-note-card";

export default function Settings() {
  const { settings, setSettings, isLoading } = useSettings();
  const { tasks } = useTasks();
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showLocalPreview, setShowLocalPreview] = useState(false);
  const { toast } = useToast();

  const localStickyNotes = useMemo<StickyNotePayload[]>(() => {
    const today = new Date();

    return tasks
      .filter((task) => {
        if (!task.dateFin || isTaskCompleted(task)) {
          return false;
        }

        try {
          const remaining = differenceInDays(parseISO(task.dateFin), today);
          return getAlertLevel(remaining) !== null;
        } catch {
          return false;
        }
      })
      .map((task, index) => {
        const remaining = differenceInDays(parseISO(task.dateFin), today);
        const alert = getAlertLevel(remaining);

        return {
          label: alert?.label ?? "ALERTE",
          color: alert?.color ?? "blue",
          tache: task.tache || "Tache sans titre",
          description: task.description || "-",
          responsable: task.responsable || "-",
          dateFin: task.dateFin || "-",
          showCloseAll: index === 0,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label, "fr"));
  }, [tasks]);

  const updateSetting = async (partial: Partial<typeof settings>) => {
    setIsSaving(true);
    try {
      const nextSettings = await setSettings({ ...settings, ...partial });
      toast({
        title: "Reglages enregistres",
        description: nextSettings.launchStickyNotesOnStartup
          ? "Les pense-betes peuvent maintenant demarrer avec Windows."
          : "Les reglages ont ete mis a jour.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Enregistrement impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const count = await previewStickyAlerts();
      toast({
        title: "Pense-betes lances",
        description: count > 0 ? `${count} fenetre(s) d'alerte ouvertes.` : "Aucune alerte active a afficher.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Apercu impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-[1100px] space-y-8 p-8">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Configuration</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reglages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parametres de journalisation, demarrage automatique, previsualisation locale et informations developpeur.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Application</h2>
              <p className="text-sm text-muted-foreground">Reglages persistants stockes separement des taches.</p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Logs detailles</p>
              <p className="text-sm text-muted-foreground">
                Par defaut, seul le niveau erreur est ecrit dans le fichier de log. Active cette option pour capturer aussi les informations et avertissements.
              </p>
            </div>
            <Switch
              checked={settings.verboseLogs}
              disabled={isLoading || isSaving}
              onCheckedChange={(checked) => { void updateSetting({ verboseLogs: checked }); }}
            />
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Lancer les pense-betes au demarrage</p>
              <p className="text-sm text-muted-foreground">
                Cree ou supprime le raccourci Windows de demarrage pour ouvrir directement les fenetres d'alerte natives.
              </p>
            </div>
            <Switch
              checked={settings.launchStickyNotesOnStartup}
              disabled={isLoading || isSaving}
              onCheckedChange={(checked) => { void updateSetting({ launchStickyNotesOnStartup: checked }); }}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => { void handlePreview(); }} disabled={isPreviewing} className="gap-2">
              <BellRing className="h-4 w-4" />
              {isPreviewing ? "Ouverture..." : "Tester les pense-betes Windows"}
            </Button>
            <Button variant="outline" onClick={() => setShowLocalPreview((current) => !current)} className="gap-2">
              <Eye className="h-4 w-4" />
              {showLocalPreview ? "Masquer l'aperçu local" : "Afficher l'aperçu local"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Apercu local des pense-betes</h2>
              <p className="text-sm text-muted-foreground">
                Cette previsualisation fonctionne dans le frontend seul, sans build Tauri, pour valider le rendu avant un envoi sur GitHub Actions.
              </p>
            </div>
          </div>

          {showLocalPreview ? (
            localStickyNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/30 p-6 text-sm text-muted-foreground">
                Aucune alerte active a previsualiser avec les donnees actuelles.
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-4 bg-slate-950/35 rounded-2xl p-4">
                {localStickyNotes.map((note, index) => (
                  <div key={`${note.tache}-${index}`} className="w-full max-w-[320px]">
                    <StickyNoteCard note={note} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              Active l'aperçu local pour verifier instantanement le contenu, les couleurs et la taille des pense-betes sans lancer Tauri.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Journalisation</h2>
              <p className="text-sm text-muted-foreground">Le fichier `alertes-taches-log.txt` reste le point de diagnostic principal.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            Les erreurs sont toujours ecrites dans le fichier de log. Les messages `INFO` et `WARN` n'apparaissent que si l'option de logs detailles est activee.
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">A propos</h2>
              <p className="text-sm text-muted-foreground">Identite visible dans l'application desktop.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Developpeur</p>
              <p className="text-lg font-semibold text-foreground">Abou Djafar</p>
              <p className="mt-1 text-sm text-muted-foreground">djafar@crfc.cm</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Produit</p>
              <p className="text-lg font-semibold text-foreground">Alertes Taches Desktop</p>
              <p className="mt-1 text-sm text-muted-foreground">Version {packageInfo.version}</p>
            </div>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
