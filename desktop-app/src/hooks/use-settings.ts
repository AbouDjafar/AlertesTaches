import { useCallback, useEffect, useState } from "react";
import { getDesktopSettings, updateDesktopSettings } from "@/lib/backend";
import type { AppSettings } from "@/lib/store";

const DEFAULT_SETTINGS: AppSettings = {
  verboseLogs: false,
  launchStickyNotesOnStartup: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const nextSettings = await getDesktopSettings();
        if (!cancelled) {
          setSettings(nextSettings);
        }
      } catch (error) {
        console.error("Unable to load desktop settings", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = useCallback(async (nextSettings: AppSettings) => {
    const persisted = await updateDesktopSettings(nextSettings);
    setSettings(persisted);
    return persisted;
  }, []);

  return { settings, setSettings: saveSettings, isLoading };
}
