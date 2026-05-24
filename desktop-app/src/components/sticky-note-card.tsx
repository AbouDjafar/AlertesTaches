import type { MouseEventHandler } from "react";
import { BellRing, X } from "lucide-react";
import type { StickyNotePayload } from "@/lib/store";

const NOTE_THEME: Record<string, { surface: string; border: string; accent: string; title: string; meta: string; badge: string }> = {
  charcoal: { surface: "#ECEFF3", border: "#D1D8E0", accent: "#6F7C8D", title: "#0F172A", meta: "#475569", badge: "#495564" },
  pink: { surface: "#FFF3F8", border: "#F4D4E0", accent: "#D98AA7", title: "#0F172A", meta: "#475569", badge: "#A85F78" },
  yellow: { surface: "#FFF9E9", border: "#F3E4B9", accent: "#D9B35A", title: "#0F172A", meta: "#475569", badge: "#9D7C2D" },
  blue: { surface: "#EEF5FF", border: "#D8E6FA", accent: "#79A8E2", title: "#0F172A", meta: "#475569", badge: "#4C78B1" },
  green: { surface: "#EFFAF2", border: "#D7ECD9", accent: "#79B98E", title: "#0F172A", meta: "#475569", badge: "#4E8661" },
};

type StickyNoteCardProps = {
  note: StickyNotePayload;
  onClose?: () => void;
  onCloseAll?: () => void;
  onMouseDown?: MouseEventHandler<HTMLElement>;
  onMouseDownCapture?: MouseEventHandler<HTMLElement>;
  className?: string;
};

export function StickyNoteCard({ note, onClose, onCloseAll, onMouseDown, onMouseDownCapture, className = "" }: StickyNoteCardProps) {
  const theme = NOTE_THEME[note.color ?? "blue"] ?? NOTE_THEME.blue;

  return (
    <div
      className={`flex w-full cursor-grab select-none flex-col overflow-hidden rounded-[24px] border shadow-2xl active:cursor-grabbing ${className}`.trim()}
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        boxShadow: "0 20px 45px rgba(20,31,46,0.20)",
      }}
      onMouseDownCapture={onMouseDownCapture}
      onMouseDown={onMouseDown}
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
        {onClose && (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ borderColor: theme.border, color: theme.meta }}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        )}
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

        {note.showCloseAll && onCloseAll && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: theme.border, color: theme.title }}
              onClick={onCloseAll}
            >
              Tout fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
