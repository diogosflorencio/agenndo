"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, type PanInfo } from "framer-motion";
import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export type DashboardStatItem = {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  /** Página de origem do dado (ex.: /dashboard/clientes). */
  href?: string;
};

export type DashboardStatSlide = {
  key: string;
  hint: string;
  items: DashboardStatItem[];
};

type Props = {
  slides: DashboardStatSlide[];
  /** ms entre troca automática (default 4200) */
  autoIntervalMs?: number;
  className?: string;
};

type TrackSlide = DashboardStatSlide & { trackKey: string };

const SNAP_SPRING = { type: "spring" as const, stiffness: 400, damping: 36, mass: 0.85 };
const LOOP_COPIES = 3;

function StatSlidePanel({
  panel,
  surfaces,
  isDark,
  dragActiveRef,
}: {
  panel: DashboardStatSlide;
  surfaces: ReturnType<typeof getDashboardSurfaces>;
  isDark: boolean;
  dragActiveRef: React.MutableRefObject<boolean>;
}) {
  const cardClass = cn(
    "min-w-0 overflow-hidden rounded-xl border p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2 select-none transition-colors",
    surfaces.cardInset
  );
  const cardHover = isDark
    ? "hover:border-primary/35 hover:bg-primary/[0.06] active:bg-primary/10"
    : "hover:border-primary/40 hover:bg-primary/[0.04] active:bg-primary/[0.08]";

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0 w-full">
      {panel.items.map((stat) => {
        const body = (
          <>
            <div className={cn("flex items-center gap-1 min-w-0", surfaces.subtitle)}>
              <span className="material-symbols-outlined text-base sm:text-[18px] shrink-0">{stat.icon}</span>
              <span className="text-[10px] sm:text-[11px] font-medium truncate leading-tight">{stat.label}</span>
            </div>
            <div className="min-w-0">
              <span
                className={cn(
                  "block text-sm sm:text-lg font-bold leading-tight tabular-nums truncate",
                  surfaces.title
                )}
              >
                {stat.value}
              </span>
              <span className={cn("block text-[9px] sm:text-[10px] font-semibold truncate mt-0.5", stat.trendColor)}>
                {stat.trend}
              </span>
            </div>
          </>
        );

        if (!stat.href) {
          return (
            <div key={`${panel.key}-${stat.label}`} className={cardClass}>
              {body}
            </div>
          );
        }

        return (
          <Link
            key={`${panel.key}-${stat.label}`}
            href={stat.href}
            className={cn(cardClass, cardHover, "group relative")}
            onClick={(e) => {
              if (dragActiveRef.current) e.preventDefault();
            }}
            aria-label={`${stat.label}: ${stat.value}. Ver detalhes`}
          >
            {body}
            <span
              className={cn(
                "material-symbols-outlined absolute top-1.5 right-1.5 text-[13px] opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none",
                isDark ? "text-primary" : "text-primary"
              )}
              aria-hidden
            >
              arrow_forward
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function normalizeLoopPosition(pos: number, n: number): number {
  if (n <= 1) return 0;
  if (pos < n) return pos + n;
  if (pos >= 2 * n) return pos - n;
  return pos;
}

export function DashboardStatCarousel({ slides, autoIntervalMs = 4200, className }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);
  const x = useMotionValue(0);
  const dragActiveRef = useRef(false);

  const safeSlides = slides.length > 0 ? slides : [{ key: "empty", hint: "-", items: [] as DashboardStatItem[] }];
  const n = safeSlides.length;
  const loopEnabled = n > 1;

  const trackSlides = useMemo((): TrackSlide[] => {
    if (!loopEnabled) {
      return safeSlides.map((s) => ({ ...s, trackKey: s.key }));
    }
    return Array.from({ length: LOOP_COPIES }, (_, copy) =>
      safeSlides.map((s) => ({ ...s, trackKey: `${s.key}__${copy}` }))
    ).flat();
  }, [safeSlides, loopEnabled]);

  const trackLen = trackSlides.length;
  const initialPosition = loopEnabled ? n : 0;
  const [position, setPosition] = useState(initialPosition);
  const positionRef = useRef(initialPosition);

  const logicalIndex = loopEnabled ? position % n : 0;
  const panel = safeSlides[logicalIndex] ?? safeSlides[0];

  const stopAuto = useCallback(() => setAutoStopped(true), []);

  const applyPosition = useCallback(
    (pos: number, instant: boolean) => {
      if (!viewportWidth) return;
      positionRef.current = pos;
      setPosition(pos);
      if (instant) {
        x.set(-pos * viewportWidth);
      } else {
        animate(x, -pos * viewportWidth, SNAP_SPRING);
      }
    },
    [viewportWidth, x]
  );

  const goTo = useCallback(
    (pos: number) => {
      if (!viewportWidth) return;
      const clamped = Math.max(0, Math.min(trackLen - 1, pos));
      animate(x, -clamped * viewportWidth, SNAP_SPRING).then(() => {
        const normalized = normalizeLoopPosition(clamped, n);
        if (normalized !== clamped) {
          x.set(-normalized * viewportWidth);
        }
        positionRef.current = normalized;
        setPosition(normalized);
      });
    },
    [viewportWidth, x, trackLen, n]
  );

  const goPrev = useCallback(() => {
    if (!loopEnabled || !viewportWidth) return;
    stopAuto();
    goTo(positionRef.current - 1);
  }, [loopEnabled, viewportWidth, stopAuto, goTo]);

  const goNext = useCallback(() => {
    if (!loopEnabled || !viewportWidth) return;
    stopAuto();
    goTo(positionRef.current + 1);
  }, [loopEnabled, viewportWidth, stopAuto, goTo]);

  const navBtnClass = cn(
    "inline-flex size-6 items-center justify-center rounded-full border transition-colors",
    isDark
      ? "border-white/12 bg-white/[0.06] text-white/70 hover:border-primary/45 hover:bg-primary/15 hover:text-primary"
      : "border-gray-200/90 bg-white text-gray-500 shadow-sm hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
  );

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!viewportWidth) return;
    applyPosition(positionRef.current, true);
  }, [viewportWidth, applyPosition]);

  useEffect(() => {
    if (!loopEnabled || autoStopped || !viewportWidth) return;
    const id = setInterval(() => {
      goTo(positionRef.current + 1);
    }, autoIntervalMs);
    return () => clearInterval(id);
  }, [loopEnabled, autoStopped, autoIntervalMs, viewportWidth, goTo]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!loopEnabled || !viewportWidth) return;
      stopAuto();
      const currentX = x.get();
      let next = Math.round(-currentX / viewportWidth);
      if (info.velocity.x < -280) next = Math.ceil(-currentX / viewportWidth - 0.15);
      if (info.velocity.x > 280) next = Math.floor(-currentX / viewportWidth + 0.15);
      next = Math.max(0, Math.min(trackLen - 1, next));
      goTo(next);
    },
    [loopEnabled, viewportWidth, x, trackLen, stopAuto, goTo]
  );

  const dragMax = viewportWidth > 0 ? -(trackLen - 1) * viewportWidth : 0;

  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3 sm:p-4 shadow-sm",
        surfaces.card,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
        <p className={cn("text-xs font-semibold tracking-wide truncate min-w-0 flex-1", surfaces.subtitle)}>
          {panel.hint}
        </p>
        {loopEnabled ? (
          <>
            <p
              className={cn(
                "shrink-0 text-[10px] font-medium flex items-center gap-0.5 md:hidden",
                isDark ? "text-primary/75" : "text-primary"
              )}
            >
              <span className="material-symbols-outlined text-[14px] leading-none">swipe</span>
              Arraste para o lado
            </p>
            <div className="hidden md:flex items-center gap-1 shrink-0" aria-label="Controles do carrossel">
              <button type="button" onClick={goPrev} className={navBtnClass} aria-label="Painel anterior">
                <span className="material-symbols-outlined text-[16px] leading-none">chevron_left</span>
              </button>
              <button type="button" onClick={goNext} className={navBtnClass} aria-label="Próximo painel">
                <span className="material-symbols-outlined text-[16px] leading-none">chevron_right</span>
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-[80px] sm:min-h-[88px] overflow-hidden touch-pan-y"
      >
        <motion.div
          className={cn("flex will-change-transform", loopEnabled && "cursor-grab active:cursor-grabbing")}
          style={{ x }}
          drag={loopEnabled ? "x" : false}
          dragConstraints={{ left: dragMax, right: 0 }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragStart={() => {
            dragActiveRef.current = true;
            stopAuto();
          }}
          onDragEnd={(e, info) => {
            handleDragEnd(e, info);
            window.setTimeout(() => {
              dragActiveRef.current = false;
            }, 80);
          }}
        >
          {trackSlides.map((s) => (
            <div
              key={s.trackKey}
              className="shrink-0 grow-0"
              style={{ width: viewportWidth > 0 ? viewportWidth : "100%" }}
              aria-hidden={s.key !== panel.key}
            >
              <StatSlidePanel panel={s} surfaces={surfaces} isDark={isDark} dragActiveRef={dragActiveRef} />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
