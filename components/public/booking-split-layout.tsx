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
          "rounded-2xl border overflow-hidden lg:rounded-2xl",
          bookUi.card,
          isDark
            ? "border-[color-mix(in_srgb,var(--public-accent)_25%,transparent)] lg:shadow-[0_0_40px_-12px_var(--pa-glow-soft)]"
            : "border-gray-200/80 shadow-sm lg:shadow-sm"
        )}
        style={isDark ? ({ ["--pa-glow-soft"]: rgbaFromHex(accent, 0.25) } as CSSProperties) : undefined}
      >
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:items-stretch">
          <div className={cn("min-w-0 p-5 sm:p-6 lg:p-7 xl:p-8 lg:border-r", divider)}>
            <div className="hidden lg:block mb-6">
              <h2 className={cn("text-xl xl:text-2xl font-bold mb-1", bookUi.title)}>{title}</h2>
              <p className={cn("text-sm", bookUi.subtitle)}>{subtitle}</p>
            </div>

            <div className="min-w-0 lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none lg:!bg-transparent">
              {left}
            </div>

            {leftFooter ? <div className="mt-3 lg:mt-4">{leftFooter}</div> : null}
          </div>

          <div
            className={cn(
              "min-w-0 border-t p-5 sm:p-6 lg:p-7 xl:p-8 lg:border-t-0",
              divider,
              isDark ? "bg-black/10 lg:bg-transparent" : "bg-gray-50/80 lg:bg-transparent"
            )}
          >
            {right}
          </div>
        </div>
      </div>
    </div>
  );
}
