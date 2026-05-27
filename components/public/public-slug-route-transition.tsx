"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { PUBLIC_PAGE_EASE, publicPageMotionDuration } from "@/lib/public-page-motion";

function publicSlugRouteMode(pathname: string): "vitrine" | "booking" {
  return /\/agendar(?:\/|$)/.test(pathname) ? "booking" : "vitrine";
}

/**
 * Crossfade vitrine ↔ agendamento. Sem `mode="wait"` para não bloquear saída para /conta etc.
 */
export function PublicSlugRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const mode = publicSlugRouteMode(pathname);
  const duration = publicPageMotionDuration(reduced, 260);
  const slide = reduced ? 0 : 10;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={mode}
        className="min-h-screen"
        initial={{ opacity: 0, y: slide }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -slide * 0.6 }}
        transition={{ duration, ease: PUBLIC_PAGE_EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
