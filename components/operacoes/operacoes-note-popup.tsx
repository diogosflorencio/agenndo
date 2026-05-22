"use client";

import { useEffect, useState } from "react";
import type { OperacoesNoteEntry } from "@/lib/operacoes/notes-storage";
import { operacoesSurface } from "./operacoes-shell";

export function OperacoesNoteButton({
  rowId,
  rowName,
  note,
  s,
  onSave,
}: {
  rowId: string;
  rowName: string;
  note?: OperacoesNoteEntry;
  s: ReturnType<typeof operacoesSurface>;
  onSave: (patch: Partial<OperacoesNoteEntry>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note?.text ?? "");
  const [done, setDone] = useState(note?.done ?? false);

  useEffect(() => {
    if (open) {
      setDraft(note?.text ?? "");
      setDone(note?.done ?? false);
    }
  }, [open, note?.text, note?.done]);

  const hasNote = Boolean(note?.text.trim());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative size-8 rounded-lg border ${s.border} flex items-center justify-center hover:bg-white/5 transition-colors`}
        title={hasNote ? "Editar observação" : "Adicionar observação"}
        aria-label="Observações"
      >
        <svg className={`size-4 ${hasNote ? s.accent : s.muted}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {hasNote ? (
          <span
            className={`absolute -top-0.5 -right-0.5 size-2 rounded-full ${note?.done ? "bg-gray-500" : "bg-[#1a7a42]"}`}
          />
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className={`w-full max-w-md rounded-xl border ${s.border} ${s.panel} p-5 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="note-dialog-title"
          >
            <h3 id="note-dialog-title" className="font-bold text-sm">
              Observação
            </h3>
            <p className={`text-xs mt-1 ${s.muted} truncate`}>{rowName}</p>
            <p className={`text-[10px] mt-2 ${s.muted}`}>Salva só neste navegador.</p>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm resize-y ${s.input}`}
              placeholder="Anotação interna…"
              autoFocus
            />

            <label className={`flex items-center gap-2 mt-3 text-xs ${s.muted}`}>
              <input
                type="checkbox"
                checked={done}
                disabled={!draft.trim()}
                onChange={(e) => setDone(e.target.checked)}
              />
              Marcar como feita
            </label>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${s.border} ${s.btnGhost}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave({ text: draft, done });
                  setOpen(false);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${s.btnPrimary}`}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
