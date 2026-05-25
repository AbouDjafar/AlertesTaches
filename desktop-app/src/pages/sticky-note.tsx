import { useEffect, useRef, useState, type PointerEvent } from "react";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  closeAllStickyWindows,
  closeCurrentStickyWindow,
  getStickyNote,
  updateStickyNoteLayout,
} from "@/lib/backend";
import type { StickyNotePayload } from "@/lib/store";
import { StickyNoteCard } from "@/components/sticky-note-card";

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  rafId: number | null;
  nextX: number;
  nextY: number;
};

export default function StickyNoteWindow() {
  const [note, setNote] = useState<StickyNotePayload | null>(null);
  const [windowLabel, setWindowLabel] = useState("");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

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
    document.body.style.userSelect = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.background = "transparent";

    if (root) {
      root.style.overflow = "hidden";
      root.style.background = "transparent";
      root.style.userSelect = "none";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.background = "";
      document.body.style.userSelect = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.background = "";
      if (root) {
        root.style.overflow = "";
        root.style.background = "";
        root.style.userSelect = "";
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

  const stopDragging = () => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    if (dragState.rafId != null) {
      window.cancelAnimationFrame(dragState.rafId);
    }

    dragStateRef.current = null;
    document.body.style.cursor = "";
  };

  const handlePointerDown = async (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    try {
      const windowHandle = getCurrentWindow();
      const [position, scaleFactor] = await Promise.all([
        windowHandle.outerPosition(),
        windowHandle.scaleFactor(),
      ]);
      const logicalPosition = position.toLogical(scaleFactor);
      const currentTarget = event.currentTarget;

      currentTarget.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.screenX - logicalPosition.x,
        offsetY: event.screenY - logicalPosition.y,
        rafId: null,
        nextX: logicalPosition.x,
        nextY: logicalPosition.y,
      };
      document.body.style.cursor = "grabbing";
      event.preventDefault();
    } catch (error) {
      console.error("Unable to initialize sticky note drag", error);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragState.nextX = event.screenX - dragState.offsetX;
    dragState.nextY = event.screenY - dragState.offsetY;

    if (dragState.rafId != null) {
      return;
    }

    dragState.rafId = window.requestAnimationFrame(() => {
      const activeDragState = dragStateRef.current;
      if (!activeDragState) {
        return;
      }

      activeDragState.rafId = null;
      void getCurrentWindow()
        .setPosition(new LogicalPosition(activeDragState.nextX, activeDragState.nextY))
        .catch((error) => {
          console.error("Unable to move sticky note window", error);
        });
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopDragging();
  };

  useEffect(() => stopDragging, []);

  if (!note) {
    return <div className="h-full w-full overflow-hidden bg-transparent" />;
  }

  return (
    <div className="h-full w-full overflow-hidden bg-transparent">
      <div ref={cardRef}>
        <StickyNoteCard
          note={note}
          onPointerDown={(event) => { void handlePointerDown(event); }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClose={() => {
            stopDragging();
            void closeCurrentStickyWindow(windowLabel);
          }}
          onCloseAll={note.showCloseAll ? () => {
            stopDragging();
            void closeAllStickyWindows();
          } : undefined}
        />
      </div>
    </div>
  );
}
