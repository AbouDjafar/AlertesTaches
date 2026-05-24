import { useState } from "react";
import { BellRing, FileText, Settings2, UserRound } from "lucide-react";
import packageInfo from "../../package.json";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { previewStickyAlerts } from "@/lib/backend";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { settings, setSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { toast } = useToast();

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
      <div className="mx-auto max-w-[960px] space-y-8 p-8">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Configuration</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reglages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parametres de journalisation, demarrage automatique et informations developpeur.
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

          <div className="pt-2">
            <Button onClick={() => { void handlePreview(); }} disabled={isPreviewing} className="gap-2">
              <BellRing className="h-4 w-4" />
              {isPreviewing ? "Ouverture..." : "Tester les pense-betes Windows"}
            </Button>
          </div>
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
