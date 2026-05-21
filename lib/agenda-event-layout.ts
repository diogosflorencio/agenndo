/** Dois intervalos se sobrepõem (toque borda-a-borda não conta). */
export function agendaEventsOverlap(
  a: { startM: number; endM: number },
  b: { startM: number; endM: number }
): boolean {
  return a.startM < b.endM && b.startM < a.endM;
}

export const AGENDA_SLOT_PX = 40;

export type AgendaPlacedEvent<T> = T & {
  col: number;
  nCol: number;
  widthPct: number;
  leftPct: number;
};

/**
 * Coloca eventos em colunas só quando há sobreposição real de horário.
 * Largura da coluna é calculada por grupo de eventos que se cruzam.
 */
export function assignAgendaColumns<T extends { id: string; startM: number; endM: number }>(
  events: T[]
): AgendaPlacedEvent<T>[] {
  if (events.length === 0) return [];

  const sorted = [...events]
    .map((e) => ({
      ...e,
      endM: Math.max(e.endM, e.startM + 1),
    }))
    .sort((a, b) => a.startM - b.startM || a.endM - b.endM);

  const colEnds: number[] = [];
  const placed = sorted.map((e) => {
    let col = colEnds.findIndex((end) => end <= e.startM);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(e.endM);
    } else {
      colEnds[col] = e.endM;
    }
    return { ...e, col };
  });

  const parent = placed.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (agendaEventsOverlap(placed[i], placed[j])) union(i, j);
    }
  }

  const clusterCols = new Map<number, number>();
  for (let i = 0; i < placed.length; i++) {
    const root = find(i);
    const next = Math.max(clusterCols.get(root) ?? 0, placed[i].col + 1);
    clusterCols.set(root, next);
  }

  return placed.map((e, i) => {
    const nCol = clusterCols.get(find(i)) ?? 1;
    return {
      ...e,
      nCol,
      widthPct: 100 / nCol,
      leftPct: (e.col * 100) / nCol,
    };
  });
}

export function agendaEventBoxStyle(opts: {
  startM: number;
  endM: number;
  gridStartMin: number;
  gridEndMin: number;
  totalMin: number;
  gridHeightPx: number;
  leftPct: number;
  widthPct: number;
}): { top: number; height: number; left: string; width: string } {
  const s = Math.max(opts.startM, opts.gridStartMin);
  const e = Math.min(Math.max(opts.endM, s + 1), opts.gridEndMin);
  const span = Math.max(1, e - s);
  const topPx = ((s - opts.gridStartMin) / opts.totalMin) * opts.gridHeightPx;
  const rawHeight = (span / opts.totalMin) * opts.gridHeightPx;
  const heightPx = Math.max(22, rawHeight - 2);
  return {
    top: topPx,
    height: heightPx,
    left: `${opts.leftPct}%`,
    width: `calc(${opts.widthPct}% - 2px)`,
  };
}
