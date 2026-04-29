"use client";

import { useRef, useCallback, useEffect, useState, useMemo, type CSSProperties } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { timeToMinutes, minutesToTime, type DaySchedule } from "@/lib/disponibilidade";
import {
  BOOKING_TZ,
  isPublicStartMinuteBookable,
  nearestBookableStartMinute,
  stepBookableStartMinute,
  listBookingGridStartMinutes,
  type AppointmentBlockRow,
  type BlockDbRow,
} from "@/lib/public-booking";
import { cn, rgbaFromHex } from "@/lib/utils";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const bufferStripe: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.14) 4px, rgba(0,0,0,0.14) 8px)`,
};

export type PublicDayTimelinePayload = {
  schedule: { active: boolean; start: string; end: string; breaks: { start: string; end: string }[] };
  durationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  viewCollaboratorId: string;
  viewCollaboratorName: string;
  existingAppointments: { timeStart: string; timeEnd: string }[];
  calendarBlocksMin: { lo: number; hi: number }[];
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  dateStr: string;
  suggestedStartMin: number | null;
};

type Props = {
  isDark: boolean;
  /** Cor de destaque da página pública (negócio.primary_color). */
  accentColor?: string;
  payload: PublicDayTimelinePayload;
  startMin: number;
  onStartMinChange: (m: number) => void;
};

function canBookAt(m: number, payload: PublicDayTimelinePayload, now: Date): boolean {
  return isPublicStartMinuteBookable({
    startMinute: m,
    dateStr: payload.dateStr,
    schedule: payload.schedule as DaySchedule,
    durationMinutes: payload.durationMinutes,
    bufferMinutes: payload.bufferMinutes,
    collaboratorId: payload.viewCollaboratorId,
    appointments: payload.appointments,
    blocks: payload.blocks,
    minAdvanceHours: payload.minAdvanceHours,
    now,
  });
}

/** Minutos relativos ao expediente → % ao longo da faixa [workStart, workEnd] */
function workSpanPct(loMin: number, hiMin: number, workStart: number, workEnd: number): { startPct: number; sizePct: number } | null {
  const span = workEnd - workStart;
  if (span <= 0) return null;
  const lo = Math.max(loMin, workStart);
  const hi = Math.min(hiMin, workEnd);
  if (hi <= lo) return null;
  const startPct = ((lo - workStart) / span) * 100;
  const sizePct = ((hi - lo) / span) * 100;
  return { startPct, sizePct };
}

function minuteToWorkPct(m: number, workStart: number, span: number): number {
  return ((clamp(m, workStart, workStart + span) - workStart) / span) * 100;
}

/** Fração do expediente já “passada” (0–1): dia passado = 1, futuro = 0, hoje = entre início do expediente e agora. */
function elapsedWorkSpanFraction(dateStr: string, workStart: number, workEnd: number, now: Date): number {
  const today = formatInTimeZone(now, BOOKING_TZ, "yyyy-MM-dd");
  if (dateStr < today) return 1;
  if (dateStr > today) return 0;
  const span = workEnd - workStart;
  if (span <= 0) return 0;
  const hm = formatInTimeZone(now, BOOKING_TZ, "HH:mm");
  const [h, mi] = hm.split(":").map((x) => parseInt(x, 10));
  const m = h * 60 + mi;
  if (m <= workStart) return 0;
  if (m >= workEnd) return 1;
  return (m - workStart) / span;
}

function useMobileVertical() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const go = () => setV(mq.matches);
    go();
    mq.addEventListener("change", go);
    return () => mq.removeEventListener("change", go);
  }, []);
  return v;
}

/** Desloca o rótulo para a direita para não sobrepor outros (tiers fixos por tipo). */
const CALLOUT_LABEL_TIER_PL = [
  "pl-0",
  "pl-1.5",
  "pl-3.5",
  "pl-5",
  "pl-7",
  "pl-9",
  "pl-11",
  "pl-[3.25rem]",
] as const;

function calloutTierClass(tier: number): string {
  return CALLOUT_LABEL_TIER_PL[Math.min(Math.max(0, tier), CALLOUT_LABEL_TIER_PL.length - 1)]!;
}

/** Linha-guia à direita da barra (só mobile). Traço horizontal de borda a borda; texto à esquerda da coluna de horas. */
function CalloutLine({
  topPct,
  variant,
  label,
  detail,
  isDark,
  labelTier = 0,
  labelAnchor = "below",
}: {
  topPct?: number;
  variant: "middle" | "top" | "bottom";
  label: string;
  detail?: string;
  isDark: boolean;
  /** 0 = início/fim; 1 = limite já passou; 2–4 = pausas; 5–6 = Você / intervalo (mais à direita para não colidir). */
  labelTier?: number;
  /**
   * `above` = texto acima da linha (ex.: Você perto do fim do expediente).
   * Padrão = abaixo da linha, centralizado na faixa.
   */
  labelAnchor?: "below" | "above";
}) {
  const line = isDark ? "bg-white/35" : "bg-gray-400";
  const text = isDark ? "text-white/90" : "text-gray-800";
  const sub = isDark ? "text-white/55" : "text-gray-500";
  /** Reserva a coluna de horários + folga para não colidir com o texto “Você”. */
  const textPad = "pr-[3.25rem]";
  const tierPl = calloutTierClass(labelTier);
  const anchorAbove = labelAnchor === "above";

  if (variant === "top") {
    return (
      <>
        <div className={cn("absolute left-0 right-0 top-0 z-0 h-px pointer-events-none", line)} aria-hidden />
        <div
          className={cn("absolute left-1 top-1.5 pointer-events-none max-w-full", textPad, tierPl)}
          style={{ zIndex: 3 + labelTier }}
        >
          <div className={cn("text-[9px] font-medium leading-snug", text)}>{label}</div>
          {detail ? <div className={cn("text-[8px] leading-tight mt-0.5", sub)}>{detail}</div> : null}
        </div>
      </>
    );
  }
  if (variant === "bottom") {
    return (
      <>
        <div className={cn("absolute left-0 right-0 bottom-0 z-0 h-px pointer-events-none", line)} aria-hidden />
        {/* Texto mais acima da borda para não colidir com o rótulo do bloco “Você” no fim do expediente */}
        <div
          className={cn(
            "absolute left-1 pointer-events-none max-w-[min(100%,calc(100%-3.5rem))]",
            textPad,
            tierPl,
            "bottom-1"
          )}
          style={{ zIndex: 3 + labelTier }}
        >
          <div className={cn("text-[9px] font-medium leading-snug", text)}>{label}</div>
          {detail ? <div className={cn("text-[8px] leading-tight mt-0.5", sub)}>{detail}</div> : null}
        </div>
      </>
    );
  }
  const textTransform = anchorAbove ? "translateY(calc(-100% - 3px))" : "translateY(4px)";
  return (
    <>
      <div
        className={cn("absolute left-0 right-0 z-0 h-px pointer-events-none", line)}
        style={{ top: `${topPct ?? 0}%`, transform: "translateY(-50%)" }}
        aria-hidden
      />
      <div
        className="absolute left-0 right-[3.25rem] flex justify-center pointer-events-none px-1"
        style={{
          top: `${topPct ?? 0}%`,
          transform: textTransform,
          zIndex: 3 + labelTier,
        }}
      >
        <div className="max-w-[min(92%,calc(100%-0.5rem))] text-center">
          <div className={cn("text-[9px] font-medium leading-snug", text)}>{label}</div>
          {detail ? <div className={cn("text-[8px] leading-tight mt-0.5", sub)}>{detail}</div> : null}
        </div>
      </div>
    </>
  );
}

/** Rótulo dentro da faixa vertical (só mobile). `bandPct` = % da altura da trilha. */
function InBarLabelV({
  bandPct,
  minBandPct = 2.4,
  children,
  textClass,
}: {
  bandPct: number;
  minBandPct?: number;
  children: React.ReactNode;
  textClass?: string;
}) {
  if (bandPct < minBandPct) return null;
  return (
    <div className="absolute inset-0 z-[12] flex items-center justify-center pointer-events-none px-0.5 md:hidden">
      <span
        className={cn(
          "text-[7px] font-bold leading-tight text-center line-clamp-3 max-w-[95%]",
          textClass ?? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Rótulo dentro da faixa horizontal (só desktop). `bandPct` = % da largura da trilha. */
function InBarLabelH({
  bandPct,
  minBandPct = 2.4,
  children,
  textClass,
}: {
  bandPct: number;
  minBandPct?: number;
  children: React.ReactNode;
  textClass?: string;
}) {
  if (bandPct < minBandPct) return null;
  return (
    <div className="absolute inset-0 z-[12] flex items-center justify-center pointer-events-none px-px">
      <span
        className={cn(
          "text-[6px] sm:text-[7px] font-bold leading-tight text-center line-clamp-2 max-w-[98%]",
          textClass ?? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function PublicBookingDayTimeline({
  isDark,
  accentColor = "#13EC5B",
  payload,
  startMin,
  onStartMinChange,
}: Props) {
  const barHRef = useRef<HTMLDivElement>(null);
  const barVRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(false);
  const dragRef = useRef<{ origin: number; origM: number; vertical: boolean } | null>(null);
  const mobileVertical = useMobileVertical();
  layoutRef.current = mobileVertical;

  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const workStart = timeToMinutes(payload.schedule.start);
  const workEnd = timeToMinutes(payload.schedule.end);
  const span = Math.max(1, workEnd - workStart);
  const dur = payload.durationMinutes;
  const buf = payload.bufferMinutes;

  const baseCollectParams = useMemo(
    () => ({
      dateStr: payload.dateStr,
      schedule: payload.schedule as DaySchedule,
      durationMinutes: dur,
      bufferMinutes: buf,
      collaboratorId: payload.viewCollaboratorId,
      appointments: payload.appointments,
      blocks: payload.blocks,
      minAdvanceHours: payload.minAdvanceHours,
    }),
    [
      payload.dateStr,
      payload.schedule,
      dur,
      buf,
      payload.viewCollaboratorId,
      payload.appointments,
      payload.blocks,
      payload.minAdvanceHours,
    ]
  );

  const snapToBookable = useCallback(
    (desired: number) => nearestBookableStartMinute({ ...baseCollectParams, now: new Date() }, desired),
    [baseCollectParams]
  );

  const gridStarts = useMemo(
    () => listBookingGridStartMinutes(workStart, workEnd, dur, buf),
    [workStart, workEnd, dur, buf]
  );

  /**
   * Marcas no eixo do slider: só limites da grade (passo duração+folga), sem horas “cheias” de relógio.
   * Inclui o fim do expediente quando não coincide com um início de slot.
   */
  const sliderAxisMarks = useMemo(() => {
    const s = new Set<number>(gridStarts);
    s.add(workEnd);
    if (gridStarts.length === 0) s.add(workStart);
    return Array.from(s).sort((a, b) => a - b);
  }, [gridStarts, workStart, workEnd]);

  const MOBILE_TRACK_MIN_H = "min-h-[min(88dvh,720px)]";

  const elapsedFrac = useMemo(() => {
    void timeTick;
    return elapsedWorkSpanFraction(payload.dateStr, workStart, workEnd, new Date());
  }, [payload.dateStr, workStart, workEnd, timeTick]);
  const elapsedPct = elapsedFrac * 100;

  const nowHm = useMemo(() => {
    void timeTick;
    return formatInTimeZone(new Date(), BOOKING_TZ, "HH:mm");
  }, [timeTick]);

  const applyFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const vertical = layoutRef.current;
      const el = vertical ? barVRef.current : barHRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let mRaw: number;
      if (vertical) {
        const py = clamp(clientY - rect.top, 0, rect.height);
        mRaw = workStart + (py / rect.height) * span;
      } else {
        const px = clamp(clientX - rect.left, 0, rect.width);
        mRaw = workStart + (px / rect.width) * span;
      }
      mRaw = Math.round(mRaw);
      const snapped = snapToBookable(mRaw);
      if (snapped != null) onStartMinChange(snapped);
    },
    [onStartMinChange, snapToBookable, span, workStart]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const vertical = layoutRef.current;
      const cx = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
      const cy = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
      dragRef.current = { origin: vertical ? cy : cx, origM: startMin, vertical };

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const d = dragRef.current;
        if (!d) return;
        if (d.vertical) {
          const el = barVRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const cy2 = "touches" in ev ? (ev.touches[0]?.clientY ?? 0) : ev.clientY;
          const dPx = cy2 - d.origin;
          const dMin = Math.round((dPx / rect.height) * span);
          const target = d.origM + dMin;
          const snapped = snapToBookable(target);
          if (snapped != null) onStartMinChange(snapped);
        } else {
          const el = barHRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const cx2 = "touches" in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX;
          const dPx = cx2 - d.origin;
          const dMin = Math.round((dPx / rect.width) * span);
          const target = d.origM + dMin;
          const snapped = snapToBookable(target);
          if (snapped != null) onStartMinChange(snapped);
        }
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    },
    [onStartMinChange, snapToBookable, span, startMin]
  );

  const onBarPointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-my-booking]")) return;
      const cx = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
      const cy = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
      applyFromPointer(cx, cy);
    },
    [applyFromPointer]
  );

  const pctService = dur + buf > 0 ? (dur / (dur + buf)) * 100 : 100;
  const pctBuf = 100 - pctService;

  const mySeg = workSpanPct(startMin, startMin + dur + buf, workStart, workEnd);

  const serviceMidWorkPct = ((startMin + dur / 2 - workStart) / span) * 100;
  const bufferMidWorkPct = ((startMin + dur + buf / 2 - workStart) / span) * 100;
  const calloutsClose = Math.abs(serviceMidWorkPct - bufferMidWorkPct) < 10;

  const blockStartPct = ((startMin - workStart) / span) * 100;
  const blockEndPct = ((startMin + dur + buf - workStart) / span) * 100;
  const intervalStartPct = ((startMin + dur - workStart) / span) * 100;
  const nearBlockEnd = blockEndPct > 84;
  /** Perto do fim do expediente, sobe o rótulo para não colidir com “Fim expediente” e com os horários da coluna. */
  const voceCalloutTopPct = nearBlockEnd
    ? calloutsClose
      ? (blockStartPct + blockEndPct) / 2
      : blockStartPct
    : serviceMidWorkPct;
  const intervalCalloutTopPct = nearBlockEnd ? intervalStartPct : bufferMidWorkPct;

  const track = isDark
    ? "bg-white/[0.14] ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]"
    : "bg-gray-200/70";

  const valid = canBookAt(startMin, payload, new Date());

  const keyHandler = (e: React.KeyboardEvent) => {
    const params = { ...baseCollectParams, now: new Date() };
    const jumps = e.shiftKey ? 4 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      let cur = startMin;
      for (let i = 0; i < jumps; i++) {
        const n = stepBookableStartMinute(params, cur, -1);
        if (n == null) break;
        cur = n;
      }
      if (cur !== startMin) onStartMinChange(cur);
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      let cur = startMin;
      for (let i = 0; i < jumps; i++) {
        const n = stepBookableStartMinute(params, cur, 1);
        if (n == null) break;
        cur = n;
      }
      if (cur !== startMin) onStartMinChange(cur);
    }
  };

  const layerBaseH = "absolute inset-y-1 rounded-md pointer-events-none";
  const layerBaseV = "absolute inset-x-1 rounded-md pointer-events-none";

  return (
    <div className="space-y-3" style={{ ["--public-accent"]: accentColor } as CSSProperties}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className={isDark ? "text-sm text-white/80" : "text-sm text-gray-700"}>
          <p className={cn("text-[11px] leading-tight mb-0.5", isDark ? "text-white/55" : "text-gray-500")}>
            Início do seu atendimento
          </p>
          <p>
            <span className="font-semibold text-[var(--public-accent)]">{minutesToTime(startMin)}</span>
            <span className={isDark ? "text-white/50" : "text-gray-500"}>
              {" "}
              · serviço {dur} min
              {buf > 0 ? <> + intervalo {buf} min</> : null}
            </span>
          </p>
        </div>
        {!valid && (
          <span className="text-sm text-amber-500 font-medium">Ajuste o bloco para um horário válido</span>
        )}
      </div>

      <p className={cn("text-[11px] md:hidden", isDark ? "text-white/50" : "text-gray-500")}>
        Expediente {minutesToTime(workStart)}–{minutesToTime(workEnd)} · cada marca ao lado = início possível de
        encaixe ({dur + buf} min
        {buf > 0 ? ", duração + intervalo" : ", duração do serviço"}).
      </p>
      <p className={cn("text-[11px] hidden md:block", isDark ? "text-white/50" : "text-gray-500")}>
        Faixa = expediente ({minutesToTime(workStart)} – {minutesToTime(workEnd)}). Encaixes a cada{" "}
        <span className="font-semibold text-[var(--public-accent)]">{dur + buf}</span> min
        {buf > 0 ? " (duração + intervalo entre atendimentos)" : " (duração do serviço)"}: o bloco só para em horários
        válidos.
      </p>

      {/* Mobile: uma linha (barra, legendas, marcas de hora) */}
      <div className={cn("flex md:hidden gap-1.5 items-stretch w-full", MOBILE_TRACK_MIN_H)}>
            <div
              ref={barVRef}
              role="slider"
              aria-valuemin={workStart}
              aria-valuemax={workEnd - dur - buf}
              aria-valuenow={startMin}
              aria-label="Início do seu atendimento no expediente"
              tabIndex={0}
              onKeyDown={keyHandler}
              className={cn(
                "relative w-14 shrink-0 rounded-2xl select-none touch-none cursor-pointer self-stretch",
                MOBILE_TRACK_MIN_H,
                track
              )}
              onMouseDown={onBarPointerDown}
              onTouchStart={onBarPointerDown}
            >
            <div
              className={cn(
                "absolute inset-1.5 rounded-xl pointer-events-none z-[2]",
                isDark
                  ? "bg-[color-mix(in_srgb,var(--public-accent)_35%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--public-accent)_30%,transparent)]"
              )}
              style={
                isDark ? { boxShadow: `0 0 12px ${rgbaFromHex(accentColor, 0.12)}` } : undefined
              }
            />

            {elapsedFrac > 0 ? (
              <div
                className="absolute inset-x-0 top-0 pointer-events-none z-[5] rounded-2xl"
                style={{
                  height: `${elapsedPct}%`,
                  background: isDark
                    ? "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 100%)"
                    : "linear-gradient(180deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.1) 100%)",
                }}
                aria-hidden
              />
            ) : null}

            {gridStarts.map((gm) => (
              <div
                key={`vg-${gm}`}
                className="absolute left-0 right-0 h-px pointer-events-none z-[7]"
                style={{
                  top: `${minuteToWorkPct(gm, workStart, span)}%`,
                  backgroundColor: isDark ? rgbaFromHex(accentColor, 0.55) : rgbaFromHex(accentColor, 0.45),
                }}
              />
            ))}

            {payload.schedule.breaks.map((br, i) => {
              const b0 = timeToMinutes(br.start);
              const b1 = timeToMinutes(br.end);
              const seg = workSpanPct(b0, b1, workStart, workEnd);
              if (!seg) return null;
              return (
                <div
                  key={`vbr-${i}`}
                  className={cn(
                    layerBaseV,
                    "z-[8] border overflow-hidden",
                    isDark ? "bg-[#0a1510] border-white/30" : "bg-gray-100 border-gray-300"
                  )}
                  style={{ top: `${seg.startPct}%`, height: `${seg.sizePct}%` }}
                >
                  <InBarLabelV bandPct={seg.sizePct}>Pausa</InBarLabelV>
                </div>
              );
            })}

            {payload.calendarBlocksMin.map((segm, i) => {
              const seg = workSpanPct(segm.lo, segm.hi, workStart, workEnd);
              if (!seg) return null;
              return (
                <div
                  key={`vcal-${i}`}
                  className={cn(
                    layerBaseV,
                    "z-[9] border overflow-hidden",
                    isDark ? "bg-violet-950/80 border-violet-400/40" : "bg-violet-100 border-violet-300"
                  )}
                  style={{ top: `${seg.startPct}%`, height: `${seg.sizePct}%` }}
                >
                  <InBarLabelV
                    bandPct={seg.sizePct}
                    textClass={isDark ? "text-violet-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" : "text-violet-950 font-extrabold"}
                  >
                    Bloqueio
                  </InBarLabelV>
                </div>
              );
            })}

            {payload.existingAppointments.map((ap, i) => {
              const s = timeToMinutes(ap.timeStart);
              const e = timeToMinutes(ap.timeEnd);
              const svcDur = Math.max(0, e - s);
              const blockEnd = e + buf;
              const seg = workSpanPct(s, blockEnd, workStart, workEnd);
              if (!seg) return null;
              const totalMin = svcDur + buf;
              const pctSvcOfBlock = totalMin > 0 ? (svcDur / totalMin) * 100 : 100;
              const pctBufOfBlock = totalMin > 0 ? (buf / totalMin) * 100 : 0;
              const svcPortionTrack = (seg.sizePct * pctSvcOfBlock) / 100;
              const bufPortionTrack = (seg.sizePct * pctBufOfBlock) / 100;
              return (
                <div
                  key={`vex-${i}`}
                  className="absolute inset-x-1 z-[10] pointer-events-none rounded-lg overflow-hidden"
                  style={{ top: `${seg.startPct}%`, height: `${seg.sizePct}%` }}
                >
                  {buf <= 0 ? (
                    <div
                      className={cn(
                        "absolute inset-0 border overflow-hidden rounded-md",
                        isDark ? "bg-slate-700/95 border-white/25" : "bg-slate-300 border-slate-400"
                      )}
                    >
                      <InBarLabelV
                        bandPct={seg.sizePct}
                        textClass={
                          isDark
                            ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                            : "text-gray-900 font-extrabold"
                        }
                      >
                        Hora marcada
                      </InBarLabelV>
                    </div>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "absolute top-0 left-0 right-0 border-l border-r border-t rounded-t-md overflow-hidden",
                          isDark ? "bg-slate-700/95 border-white/25" : "bg-slate-300 border-slate-400"
                        )}
                        style={{ height: `${pctSvcOfBlock}%` }}
                      >
                        <InBarLabelV
                          bandPct={svcPortionTrack}
                          textClass={
                            isDark
                              ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                              : "text-gray-900 font-extrabold"
                          }
                        >
                          Hora marcada
                        </InBarLabelV>
                      </div>
                      <div
                        className={cn(
                          "absolute left-0 right-0 border-l border-r border-b rounded-b-md overflow-hidden border-t",
                          isDark ? "border-white/25" : "border-slate-400"
                        )}
                        style={{
                          top: `${pctSvcOfBlock}%`,
                          height: `${pctBufOfBlock}%`,
                          ...bufferStripe,
                          backgroundColor: isDark ? "rgba(15,23,42,0.82)" : "rgba(148,163,184,0.55)",
                        }}
                      >
                        <InBarLabelV bandPct={bufPortionTrack} minBandPct={1.8} textClass="text-white/95 drop-shadow-sm">
                          Intervalo
                        </InBarLabelV>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {mySeg ? (
              <div
                data-my-booking
                className="absolute inset-x-1 z-[20] cursor-grab active:cursor-grabbing rounded-xl overflow-hidden"
                style={{ top: `${mySeg.startPct}%`, height: `${mySeg.sizePct}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startDrag(e);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  startDrag(e);
                }}
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 border-2 border-b-0 rounded-t-lg overflow-hidden",
                    valid
                      ? isDark
                        ? "bg-[color-mix(in_srgb,var(--public-accent)_90%,transparent)] border-[var(--public-accent)]"
                        : "bg-[color-mix(in_srgb,var(--public-accent)_85%,transparent)] border-[var(--public-accent)]"
                      : "bg-amber-500/50 border-amber-400"
                  )}
                  style={{
                    height: `${pctService}%`,
                    ...(valid
                      ? { boxShadow: `0 0 14px ${rgbaFromHex(accentColor, isDark ? 0.35 : 0.25)}` }
                      : {}),
                  }}
                >
                  <InBarLabelV
                    bandPct={(mySeg.sizePct * pctService) / 100}
                    textClass="text-black font-extrabold drop-shadow-sm"
                  >
                    Você
                  </InBarLabelV>
                </div>
                <div
                  className={cn(
                    "absolute left-0 right-0 border-2 border-t-0 rounded-b-lg overflow-hidden",
                    valid ? "border-[var(--public-accent)]" : "border-amber-400"
                  )}
                  style={{
                    top: `${pctService}%`,
                    height: `${pctBuf}%`,
                    ...bufferStripe,
                    backgroundColor: isDark ? rgbaFromHex(accentColor, 0.22) : rgbaFromHex(accentColor, 0.35),
                  }}
                >
                  {pctBuf > 0.5 ? (
                    <InBarLabelV
                      bandPct={(mySeg.sizePct * pctBuf) / 100}
                      minBandPct={1.8}
                      textClass="text-black/90 font-bold drop-shadow-sm"
                    >
                      Intervalo
                    </InBarLabelV>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

        <div
          className={cn(
            "relative flex-1 min-w-0 self-stretch min-h-0 pl-1",
            MOBILE_TRACK_MIN_H,
            isDark ? "border-l border-white/15" : "border-l border-gray-300/90"
          )}
        >
          <CalloutLine variant="top" isDark={isDark} label="Início expediente" detail={minutesToTime(workStart)} />
          <CalloutLine variant="bottom" isDark={isDark} label="Fim expediente" detail={minutesToTime(workEnd)} />
          {elapsedFrac > 0 && elapsedFrac < 1 ? (
            <CalloutLine
              variant="middle"
              topPct={elapsedPct}
              labelTier={1}
              isDark={isDark}
              label="Já passou"
              detail={`Agora ${nowHm}: não dá para marcar acima`}
            />
          ) : null}
          {payload.schedule.breaks.map((br, i) => {
            const b0 = timeToMinutes(br.start);
            const b1 = timeToMinutes(br.end);
            const mid = (b0 + b1) / 2;
            const topPct = ((mid - workStart) / span) * 100;
            return (
              <CalloutLine
                key={`callout-pause-${i}`}
                variant="middle"
                topPct={topPct}
                labelTier={2 + Math.min(i, 2)}
                isDark={isDark}
                label="Pausa"
                detail={`${minutesToTime(b0)} – ${minutesToTime(b1)}`}
              />
            );
          })}
          {calloutsClose ? (
            buf > 0 ? (
              <CalloutLine
                variant="middle"
                topPct={voceCalloutTopPct}
                labelTier={5}
                isDark={isDark}
                label="Você + intervalo"
                detail={`${minutesToTime(startMin)} – ${minutesToTime(startMin + dur + buf)}`}
              />
            ) : (
              <CalloutLine
                variant="middle"
                topPct={voceCalloutTopPct}
                labelTier={5}
                isDark={isDark}
                label="Você"
                detail={`${minutesToTime(startMin)} – ${minutesToTime(startMin + dur)}`}
              />
            )
          ) : (
            <>
              <CalloutLine
                variant="middle"
                topPct={voceCalloutTopPct}
                labelTier={5}
                isDark={isDark}
                label="Você"
                detail={`${minutesToTime(startMin)} – ${minutesToTime(startMin + dur)}`}
              />
              {buf > 0 ? (
                <CalloutLine
                  variant="middle"
                  topPct={intervalCalloutTopPct}
                  labelTier={6}
                  isDark={isDark}
                  label="Intervalo"
                  detail={`${minutesToTime(startMin + dur)} – ${minutesToTime(startMin + dur + buf)}`}
                />
              ) : null}
            </>
          )}
          {/* Mesma escala % da barra; traços de CalloutLine passam por baixo (z-0) destes rótulos (z-[1]). */}
          <div className="absolute inset-y-0 right-0 z-[1] w-[2.75rem] pointer-events-none">
            {sliderAxisMarks.map((m) => (
              <span
                key={`vgl-${m}`}
                className={cn(
                  "absolute right-0 text-[9px] font-mono tabular-nums -translate-y-1/2",
                  isDark ? "text-white/55" : "text-gray-500"
                )}
                style={{ top: `${minuteToWorkPct(m, workStart, span)}%` }}
              >
                {minutesToTime(m)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: horizontal só expediente */}
      <div className="hidden md:block space-y-1">
        <div className="relative h-3 select-none">
          {sliderAxisMarks.map((m) => (
            <span
              key={`hh-${m}`}
              className={cn(
                "absolute text-[9px] font-mono tabular-nums -translate-x-1/2",
                isDark ? "text-white/50" : "text-gray-400"
              )}
              style={{ left: `${minuteToWorkPct(m, workStart, span)}%` }}
            >
              {minutesToTime(m)}
            </span>
          ))}
        </div>

        <div
          ref={barHRef}
          role="slider"
          aria-valuemin={workStart}
          aria-valuemax={workEnd - dur - buf}
          aria-valuenow={startMin}
          aria-label="Início do seu atendimento no expediente"
          tabIndex={0}
          className={cn("relative isolate h-11 sm:h-10 rounded-lg select-none touch-none cursor-pointer", track)}
          onMouseDown={onBarPointerDown}
          onTouchStart={onBarPointerDown}
          onKeyDown={keyHandler}
        >
          <div
            className={cn(
              "absolute inset-y-1 inset-x-1 rounded-md pointer-events-none z-0 overflow-hidden",
              isDark
                ? "bg-[color-mix(in_srgb,var(--public-accent)_35%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--public-accent)_30%,transparent)]"
            )}
            style={isDark ? { boxShadow: `0 0 12px ${rgbaFromHex(accentColor, 0.12)}` } : undefined}
          >
      
          </div>

          {elapsedFrac > 0 ? (
            <div
              className="absolute inset-y-0 left-0 pointer-events-none z-[4] rounded-lg"
              style={{
                width: `${elapsedPct}%`,
                background: isDark
                  ? "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 100%)"
                  : "linear-gradient(90deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.1) 100%)",
              }}
              aria-hidden
            />
          ) : null}

          {sliderAxisMarks.map((m) => (
            <div
              key={`hg-${m}`}
              className="absolute top-0 bottom-0 w-px pointer-events-none z-[6] opacity-45"
              style={{
                left: `${minuteToWorkPct(m, workStart, span)}%`,
                backgroundColor: isDark ? rgbaFromHex(accentColor, 0.55) : rgbaFromHex(accentColor, 0.45),
              }}
            />
          ))}

          {payload.schedule.breaks.map((br, i) => {
            const b0 = timeToMinutes(br.start);
            const b1 = timeToMinutes(br.end);
            const seg = workSpanPct(b0, b1, workStart, workEnd);
            if (!seg) return null;
            return (
              <div
                key={`hbr-${i}`}
                className={cn(
                  layerBaseH,
                  "z-[7] border overflow-hidden",
                  isDark ? "bg-[#0a1510] border-white/30" : "bg-gray-100 border-gray-300"
                )}
                style={{ left: `${seg.startPct}%`, width: `${seg.sizePct}%` }}
              >
                <InBarLabelH bandPct={seg.sizePct} textClass={isDark ? "text-white/90" : "text-gray-800"}>
                  Pausa do dia
                </InBarLabelH>
              </div>
            );
          })}

          {payload.calendarBlocksMin.map((segm, i) => {
            const seg = workSpanPct(segm.lo, segm.hi, workStart, workEnd);
            if (!seg) return null;
            return (
              <div
                key={`hcal-${i}`}
                className={cn(
                  layerBaseH,
                  "z-[8] border overflow-hidden",
                  isDark ? "bg-violet-950/80 border-violet-400/40" : "bg-violet-100 border-violet-300"
                )}
                style={{ left: `${seg.startPct}%`, width: `${seg.sizePct}%` }}
              >
                <InBarLabelH
                  bandPct={seg.sizePct}
                  textClass={isDark ? "text-violet-100" : "text-violet-950 font-extrabold"}
                >
                  Bloqueio no calendário
                </InBarLabelH>
              </div>
            );
          })}

          {payload.existingAppointments.map((ap, i) => {
            const s = timeToMinutes(ap.timeStart);
            const e = timeToMinutes(ap.timeEnd);
            const svcDur = Math.max(0, e - s);
            const blockEnd = e + buf;
            const seg = workSpanPct(s, blockEnd, workStart, workEnd);
            if (!seg) return null;
            const totalMin = svcDur + buf;
            const pctSvcOfBlock = totalMin > 0 ? (svcDur / totalMin) * 100 : 100;
            const pctBufOfBlock = totalMin > 0 ? (buf / totalMin) * 100 : 0;
            const wSvc = pctSvcOfBlock;
            const svcBandTrack = (seg.sizePct * wSvc) / 100;
            const bufBandTrack = (seg.sizePct * pctBufOfBlock) / 100;
            return (
              <div
                key={`hex-${i}`}
                className="absolute inset-y-0.5 z-[15] pointer-events-none rounded-md overflow-hidden"
                style={{ left: `${seg.startPct}%`, width: `${seg.sizePct}%` }}
              >
                {buf <= 0 ? (
                  <div
                    className={cn(
                      "absolute inset-0 border overflow-hidden rounded-md",
                      isDark ? "bg-slate-700/95 border-white/20" : "bg-slate-300 border-slate-400"
                    )}
                  >
                    <InBarLabelH
                      bandPct={seg.sizePct}
                      textClass={isDark ? "text-white" : "text-gray-900 font-extrabold"}
                    >
                      Hora marcada
                    </InBarLabelH>
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 left-0 border-y border-l rounded-l overflow-hidden",
                        isDark ? "bg-slate-700/95 border-white/20" : "bg-slate-300 border-slate-400"
                      )}
                      style={{ width: `${wSvc}%` }}
                    >
                      <InBarLabelH
                        bandPct={svcBandTrack}
                        textClass={isDark ? "text-white" : "text-gray-900 font-extrabold"}
                      >
                        Hora marcada
                      </InBarLabelH>
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 border-y border-r rounded-r overflow-hidden border-l",
                        isDark ? "border-white/20" : "border-slate-400"
                      )}
                      style={{
                        left: `${wSvc}%`,
                        width: `${pctBufOfBlock}%`,
                        ...bufferStripe,
                        backgroundColor: isDark ? "rgba(15,23,42,0.75)" : "rgba(148,163,184,0.5)",
                      }}
                    >
                      <InBarLabelH bandPct={bufBandTrack} minBandPct={1.8} textClass="text-white/95">
                        Intervalo
                      </InBarLabelH>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {mySeg ? (
            <div
              data-my-booking
              className="absolute inset-y-0.5 z-[25] cursor-grab active:cursor-grabbing rounded-lg overflow-hidden"
              style={{ left: `${mySeg.startPct}%`, width: `${mySeg.sizePct}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag(e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                startDrag(e);
              }}
            >
              <div
                className={cn(
                  "absolute top-0 bottom-0 left-0 rounded-l-md border-2 border-r-0 overflow-hidden",
                  valid
                    ? isDark
                      ? "bg-[color-mix(in_srgb,var(--public-accent)_90%,transparent)] border-[var(--public-accent)]"
                      : "bg-[color-mix(in_srgb,var(--public-accent)_85%,transparent)] border-[var(--public-accent)]"
                    : "bg-amber-500/50 border-amber-400"
                )}
                style={{
                  width: `${pctService}%`,
                  ...(valid
                    ? { boxShadow: `0 0 14px ${rgbaFromHex(accentColor, isDark ? 0.35 : 0.25)}` }
                    : {}),
                }}
              >
                <InBarLabelH
                  bandPct={(mySeg.sizePct * pctService) / 100}
                  textClass="text-black font-extrabold drop-shadow-sm"
                >
                  Você (arraste)
                </InBarLabelH>
              </div>
              <div
                className={cn(
                  "absolute top-0 bottom-0 right-0 rounded-r-md border-2 border-l-0 overflow-hidden",
                  valid ? "border-[var(--public-accent)]" : "border-amber-400"
                )}
                style={{
                  left: `${pctService}%`,
                  width: `${pctBuf}%`,
                  ...bufferStripe,
                  backgroundColor: isDark ? rgbaFromHex(accentColor, 0.22) : rgbaFromHex(accentColor, 0.35),
                }}
              >
                {pctBuf > 0.5 ? (
                  <InBarLabelH
                    bandPct={(mySeg.sizePct * pctBuf) / 100}
                    minBandPct={1.8}
                    textClass="text-black/90 font-bold drop-shadow-sm"
                  >
                    Intervalo
                  </InBarLabelH>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <p className={cn("text-[11px] leading-relaxed hidden md:block", isDark ? "text-white/45" : "text-gray-500")}>
        Toque na barra ou arraste o bloco &quot;Você&quot;: ele encaixa só nos horários da grade ({dur + buf} min entre
        cada início de vaga
        {buf > 0 ? ", já contando o intervalo após o serviço" : ""}).
      </p>
    </div>
  );
}
