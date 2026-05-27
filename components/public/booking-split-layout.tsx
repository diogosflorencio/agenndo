"use client";

import { type CSSProperties, type ReactNode } from "react";
import { cn, rgbaFromHex } from "@/lib/utils";
import { type getPublicBookUi } from "@/lib/public-book-ui";

type Props = {
  bookUi: ReturnType<typeof getPublicBookUi>;
  isDark: boolean;
  accent: string;
  title: string;
  subtitle: string;
  left: ReactNode;
  right: ReactNode;
  leftFooter?: ReactNode;
};

export function PublicBookingSplitLayout({
  bookUi,
  isDark,
  accent,
  title,
  subtitle,
  left,
  right,
  leftFooter,
}: Props) {
  const divider = isDark ? "border-white/[0.08]" : "border-gray-200";

  return (
    <div className="w-full max-w-lg mx-auto lg:max-w-none">
      <div className="mb-5 lg:mb-0 lg:hidden">
        <h2 className={cn("text-xl sm:text-2xl font-bold mb-1", bookUi.title)}>{title}</h2>
        <p className={cn("text-sm", bookUi.subtitle)}>{subtitle}</p>
      </div>

      <div
        className={cn(
          "lg:rounded-2xl lg:border lg:overflow-hidden",
          bookUi.card,
          isDark
            ? "lg:border-[color-mix(in_srgb,var(--public-accent)_25%,transparent)] lg:shadow-[0_0_40px_-12px_var(--pa-glow-soft)]"
            : "lg:shadow-sm"
        )}
        style={isDark ? ({ ["--pa-glow-soft"]: rgbaFromHex(accent, 0.25) } as CSSProperties) : undefined}
      >
        <div className="lg:grid lg:grid-cols-2 lg:items-stretch">
          <div className={cn("min-w-0 lg:p-7 xl:p-8 lg:border-r", divider)}>
            <div className="hidden lg:block mb-6">
              <h2 className={cn("text-xl xl:text-2xl font-bold mb-1", bookUi.title)}>{title}</h2>
              <p className={cn("text-sm", bookUi.subtitle)}>{subtitle}</p>
            </div>

            <div
              className={cn(
                "rounded-2xl border p-5 sm:p-6",
                bookUi.card,
                "lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none lg:!bg-transparent"
              )}
            >
              {left}
            </div>

            {leftFooter ? <div className="mt-3 lg:mt-4">{leftFooter}</div> : null}
          </div>

          <div className={cn("hidden lg:block min-w-0 lg:p-7 xl:p-8", divider)}>{right}</div>
        </div>
      </div>
    </div>
  );
}
