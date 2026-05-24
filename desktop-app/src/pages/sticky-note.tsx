import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BellRing, X } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  closeAllStickyWindows,
  closeCurrentStickyWindow,
  getStickyNote,
  updateStickyNoteLayout,
} from "@/lib/backend";
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
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentWindow = getCurrentWebviewWindow();
    setWindowLabel(currentWindow.label);

    const loadStickyNote = async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          const payload = await getStickyNote(currentWindow.label);
          setNote(payload);
          return;
        } catch (error) {
          if (attempt === 19) {
            console.error("Unable to load sticky note payload", error);
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 120));
        }
      }
    };

    void loadStickyNote();
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    document.body.style.overflow = "hidden";
    document.body.style.background = "transparent";
    document.documentElement.style.overflow = "hidden";

    if (root) {
      root.style.overflow = "hidden";
      root.style.background = "transparent";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.background = "";
      document.documentElement.style.overflow = "";
      if (root) {
        root.style.overflow = "";
        root.style.background = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!note || !windowLabel || !cardRef.current) {
      return;
    }

    let lastHeight = 0;
    const element = cardRef.current;

    const syncHeight = () => {
      const nextHeight = Math.ceil(element.getBoundingClientRect().height + 16);
      if (Math.abs(nextHeight - lastHeight) < 2) {
        return;
      }
      lastHeight = nextHeight;
      void updateStickyNoteLayout(windowLabel, nextHeight).catch((error) => {
        console.error("Unable to update sticky note layout", error);
      });
    };

    syncHeight();
    const observer = new ResizeObserver(() => {
      syncHeight();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [note, windowLabel]);

  const theme = useMemo(() => NOTE_THEME[note?.color ?? "blue"] ?? NOTE_THEME.blue, [note?.color]);

  const handleDragStart = async (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    try {
      await getCurrentWindow().startDragging();
    } catch (error) {
      console.error("Unable to start sticky note drag", error);
    }
  };

  if (!note) {
    return (
      <div className="h-full w-full overflow-hidden bg-transparent p-2">
        <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50/95 text-sm text-slate-700 shadow-2xl">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-transparent p-2">
      <div
        ref={cardRef}
        className="flex w-full select-none flex-col overflow-hidden rounded-[24px] border shadow-2xl"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: "0 20px 45px rgba(20,31,46,0.20)",
        }}
        onMouseDown={(event) => { void handleDragStart(event); }}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.border, color: theme.accent }}
          >
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.badge }}>
              {note.label}
            </p>
            <h1 className="mt-1 text-lg font-bold leading-tight" style={{ color: theme.title }}>
              {note.tache}
            </h1>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ borderColor: theme.border, color: theme.meta }}
            onClick={() => { void closeCurrentStickyWindow(windowLabel); }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="min-h-[88px] rounded-2xl border border-white/30 bg-white/40 p-4">
            <p className="text-sm leading-6" style={{ color: theme.meta }}>
              {note.description}
            </p>
          </div>

          <div className="grid gap-2 text-sm" style={{ color: theme.meta }}>
            <p><span className="font-semibold">Responsable :</span> {note.responsable}</p>
            <p><span className="font-semibold">Date de fin :</span> {note.dateFin}</p>
          </div>

          {note.showCloseAll && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
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
