import { useEffect, useMemo, useState } from "react";
import { BellRing, X } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { closeAllStickyWindows, closeCurrentStickyWindow, getStickyNote } from "@/lib/backend";
import type { StickyNotePayload } from "@/lib/store";

const NOTE_THEME: Record<string, { surface: string; border: string; accent: string; title: string; meta: string; badge: string }> = {
  charcoal: { surface: "#ECEFF3", border: "#D1D8E0", accent: "#6F7C8D", title: "#0F172A", meta: "#475569", badge: "#495564" },
  pink: { surface: "#FFF3F8", border: "#F4D4E0", accent: "#D98AA7", title: "#0F172A", meta: "#475569", badge: "#A85F78" },
  yellow: { surface: "#FFF9E9", border: "#F3E4B9", accent: "#D9B35A", title: "#0F172A", meta: "#475569", badge: "#9D7C2D" },
  blue: { surface: "#EEF5FF", border: "#D8E6FA", accent: "#79A8E2", title: "#0F172A", meta: "#475569", badge: "#4C78B1" },
  green: { surface: "#EFFAF2", border: "#D7ECD9", accent: "#79B98E", title: "#0F172A", meta: "#475569", badge: "#4E8661" },
};

export default function StickyNoteWindow() {
  const [note, setNote] = useState<StickyNotePayload | null>(null);
  const [windowLabel, setWindowLabel] = useState("");

  useEffect(() => {
    const currentWindow = getCurrentWebviewWindow();
    setWindowLabel(currentWindow.label);
    void getStickyNote(currentWindow.label).then(setNote).catch((error) => {
      console.error("Unable to load sticky note payload", error);
    });
  }, []);

  const theme = useMemo(() => NOTE_THEME[note?.color ?? "blue"] ?? NOTE_THEME.blue, [note?.color]);

  if (!note) {
    return (
      <div className="h-screen w-screen bg-transparent flex items-center justify-center text-white text-sm">
        Chargement...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-transparent p-2">
      <div
        className="h-full w-full rounded-[24px] border shadow-2xl flex flex-col"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: "0 20px 45px rgba(20,31,46,0.20)",
        }}
      >
        <div className="p-4 flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme.border, color: theme.accent }}
          >
            <BellRing className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: theme.badge }}>
              {note.label}
            </p>
            <h1 className="text-lg font-bold leading-tight mt-1" style={{ color: theme.title }}>
              {note.tache}
            </h1>
          </div>
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ borderColor: theme.border, color: theme.meta }}
            onClick={() => { void closeCurrentStickyWindow(windowLabel); }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-4 flex-1 flex flex-col gap-4">
          <div className="rounded-2xl bg-white/40 border border-white/30 p-4 min-h-[88px]">
            <p className="text-sm leading-6" style={{ color: theme.meta }}>
              {note.description}
            </p>
          </div>

          <div className="grid gap-2 text-sm" style={{ color: theme.meta }}>
            <p><span className="font-semibold">Responsable :</span> {note.responsable}</p>
            <p><span className="font-semibold">Date de fin :</span> {note.dateFin}</p>
          </div>

          {note.showCloseAll && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-semibold border"
                style={{ borderColor: theme.border, color: theme.title }}
                onClick={() => { void closeAllStickyWindows(); }}
              >
                Tout fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
