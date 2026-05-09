"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export type DashboardStatItem = {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
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

export function DashboardStatCarousel({ slides, autoIntervalMs = 4200, className }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [slide, setSlide] = useState(0);
  const safeSlides = slides.length > 0 ? slides : [{ key: "empty", hint: "—", items: [] as DashboardStatItem[] }];
  const n = safeSlides.length;

  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => {
      setSlide((i) => (i + 1) % n);
    }, autoIntervalMs);
    return () => clearInterval(id);
  }, [n, autoIntervalMs]);

  const panel = safeSlides[slide] ?? safeSlides[0];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        isDark ? "border-white/[0.08] bg-[#080c0a]" : "border-gray-200 bg-white",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className={cn("text-xs font-semibold tracking-wide", isDark ? "text-gray-400" : "text-gray-500")}>{panel.hint}</p>
        {n > 1 ? (
          <div className="flex gap-1 shrink-0" role="tablist" aria-label="Painéis de estatísticas">
            {safeSlides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === slide}
                onClick={() => setSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === slide ? "w-5 bg-primary" : isDark ? "w-1.5 bg-white/20 hover:bg-white/35" : "w-1.5 bg-gray-200 hover:bg-gray-300"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative min-h-[88px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={panel.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex gap-2"
          >
            {panel.items.map((stat) => (
              <div
                key={`${panel.key}-${stat.label}`}
                className={cn(
                  "flex-1 min-w-0 basis-0 rounded-xl border p-3 flex flex-col gap-2",
                  isDark ? "border-white/[0.06] bg-[#020403]" : "border-gray-100 bg-gray-50/80"
                )}
              >
                <div className={cn("flex items-center gap-1.5 min-w-0", isDark ? "text-gray-400" : "text-gray-500")}>
                  <span className="material-symbols-outlined text-[18px] shrink-0">{stat.icon}</span>
                  <span className="text-[11px] font-medium truncate">{stat.label}</span>
                </div>
                <div className="flex items-end gap-1 flex-wrap">
                  <span className={cn("text-xl font-bold leading-none tabular-nums", isDark ? "text-white" : "text-gray-900")}>
                    {stat.value}
                  </span>
                  <span className={cn("text-[10px] font-semibold mb-0.5", stat.trendColor)}>{stat.trend}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
