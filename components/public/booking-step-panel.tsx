"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

type Props = {
  /** Identificador estável da “tela” (passo + sub-fase). */
  stepKey: string;
  step: number;
  children: ReactNode;
};

/**
 * Fade + leve deslize entre etapas do agendamento público.
 * Respeita prefers-reduced-motion.
 */
export function BookingStepPanel({ stepKey, step, children }: Props) {
  const reduced = useReducedMotion();
  const prevStepRef = useRef(step);
  const directionRef = useRef(1);

  if (step !== prevStepRef.current) {
    directionRef.current = step > prevStepRef.current ? 1 : -1;
    prevStepRef.current = step;
  }

  const dir = directionRef.current;
  const slide = reduced ? 0 : 12;
  const duration = reduced ? 0.01 : 0.26;

  return (
    <div className="relative min-h-[10rem] overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          initial={{ opacity: 0, x: dir * slide }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -slide * 0.65 }}
          transition={{ duration, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
