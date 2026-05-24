import { useState } from "react";
import { BellRing, FileText, Settings2, UserRound } from "lucide-react";
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
        title: "Réglages enregistrés",
        description: nextSettings.launchStickyNotesOnStartup
          ? "Les pense-bêtes peuvent maintenant démarrer avec Windows."
          : "Les réglages ont été mis à jour.",
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
        title: "Pense-bêtes lancés",
        description: count > 0 ? `${count} fenêtre(s) d'alerte ouvertes.` : "Aucune alerte active à afficher.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Aperçu impossible",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-[960px] mx-auto space-y-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Configuration</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Réglages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Paramètres de journalisation, démarrage automatique et informations développeur.
          </p>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Application</h2>
              <p className="text-sm text-muted-foreground">Réglages persistants stockés séparément des tâches.</p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Logs détaillés</p>
              <p className="text-sm text-muted-foreground">
                Par défaut, seul le niveau erreur est écrit dans le fichier de log. Active cette option pour capturer aussi les informations et avertissements.
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
              <p className="text-sm font-semibold text-foreground">Lancer les pense-bêtes au démarrage</p>
              <p className="text-sm text-muted-foreground">
                Crée ou supprime le raccourci Windows de démarrage pour ouvrir directement les fenêtres d’alerte natives.
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
              <BellRing className="w-4 h-4" />
              {isPreviewing ? "Ouverture..." : "Tester les pense-bêtes"}
            </Button>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Journalisation</h2>
              <p className="text-sm text-muted-foreground">Le fichier `alertes-taches-log.txt` reste le point de diagnostic principal.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            Les erreurs sont toujours écrites dans le fichier de log. Les messages `INFO` et `WARN` n’apparaissent que si l’option de logs détaillés est activée.
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <UserRound className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">À propos</h2>
              <p className="text-sm text-muted-foreground">Identité visible dans l’application desktop.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">Développeur</p>
              <p className="text-lg font-semibold text-foreground">Abou Djafar</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">Produit</p>
              <p className="text-lg font-semibold text-foreground">Alertes Tâches Desktop</p>
            </div>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
