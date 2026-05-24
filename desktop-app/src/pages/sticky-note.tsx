import { useEffect, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  closeAllStickyWindows,
  closeCurrentStickyWindow,
  getStickyNote,
  updateStickyNoteLayout,
} from "@/lib/backend";
import type { StickyNotePayload } from "@/lib/store";
import { StickyNoteCard } from "@/components/sticky-note-card";

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
    document.documentElement.style.background = "transparent";

    if (root) {
      root.style.overflow = "hidden";
      root.style.background = "transparent";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.background = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.background = "";
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
      const nextHeight = Math.ceil(element.getBoundingClientRect().height);
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

  if (!note) {
    return <div className="h-full w-full overflow-hidden bg-transparent" />;
  }

  return (
    <div className="h-full w-full overflow-hidden bg-transparent">
      <div ref={cardRef}>
        <StickyNoteCard
          note={note}
          onClose={() => { void closeCurrentStickyWindow(windowLabel); }}
          onCloseAll={note.showCloseAll ? () => { void closeAllStickyWindows(); } : undefined}
        />
      </div>
    </div>
  );
}
