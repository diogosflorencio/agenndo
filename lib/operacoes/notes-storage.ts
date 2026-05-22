const KEY = "agenndo_operacoes_notes_v1";

export type OperacoesNoteEntry = {
  text: string;
  done: boolean;
};

export type OperacoesNotesMap = Record<string, OperacoesNoteEntry>;

function normalizeEntry(raw: unknown): OperacoesNoteEntry | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? { text: t, done: false } : null;
  }
  if (raw && typeof raw === "object" && "text" in raw) {
    const o = raw as { text?: string; done?: boolean };
    const t = (o.text ?? "").trim();
    if (!t) return null;
    return { text: t, done: Boolean(o.done) };
  }
  return null;
}

export function loadOperacoesNotes(): OperacoesNotesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: OperacoesNotesMap = {};
    for (const [id, v] of Object.entries(parsed)) {
      const entry = normalizeEntry(v);
      if (entry) out[id] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveOperacoesNote(rowId: string, patch: Partial<OperacoesNoteEntry>): void {
  if (typeof window === "undefined") return;
  const map = loadOperacoesNotes();
  const prev = map[rowId] ?? { text: "", done: false };
  const next: OperacoesNoteEntry = {
    text: patch.text !== undefined ? patch.text : prev.text,
    done: patch.done !== undefined ? patch.done : prev.done,
  };
  if (!next.text.trim()) delete map[rowId];
  else map[rowId] = next;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function noteHasText(map: OperacoesNotesMap, rowId: string): boolean {
  return Boolean(map[rowId]?.text.trim());
}
