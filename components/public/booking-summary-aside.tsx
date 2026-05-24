"use client";

import Image from "next/image";
import { type CSSProperties } from "react";
import { cn, formatCurrency, rgbaFromHex } from "@/lib/utils";
import { normalizeVariantGallery } from "@/lib/service-variants";
import {
  publicEmojiClass,
  publicMaterialIconClass,
  publicMediaTileClass,
  type getPublicBookUi,
} from "@/lib/public-book-ui";

type CollabRow = { id: string; name: string; role: string | null; avatar_url: string | null };

type ServiceRow = {
  name: string;
  duration_minutes: number;
  emoji: string | null;
  image_url: string | null;
  variant_gallery: unknown;
};

type Props = {
  selectedService: ServiceRow;
  selectedVariantIndex: number | null;
  selectedCollab: CollabRow | "any" | null;
  selectedDate: string | null;
  selectedTime: string | null;
  priceCents: number;
  isDark: boolean;
  accent: string;
  bookUi: ReturnType<typeof getPublicBookUi>;
  footerHint: string;
  className?: string;
  /** Dentro do layout unificado (sem card próprio). */
  embedded?: boolean;
};

export function PublicBookingSummaryAside({
  selectedService,
  selectedVariantIndex,
  selectedCollab,
  selectedDate,
  selectedTime,
  priceCents,
  isDark,
  accent,
  bookUi,
  footerHint,
  className,
  embedded = false,
}: Props) {
  const variantTitle =
    selectedVariantIndex != null
      ? normalizeVariantGallery(selectedService.variant_gallery)[selectedVariantIndex]?.title?.trim() ||
        `Opção ${selectedVariantIndex + 1}`
      : null;

  const dateLabel =
    selectedDate != null
      ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : null;

  return (
    <aside className={cn(embedded ? "min-w-0" : "hidden lg:block min-w-0", className)}>
      <div
        className={cn(
          embedded
            ? "min-w-0"
            : cn(
                "sticky top-28 rounded-2xl border overflow-hidden",
                bookUi.card,
                isDark
                  ? "border-[color-mix(in_srgb,var(--public-accent)_25%,transparent)] shadow-[0_0_40px_-12px_var(--pa-glow-soft)]"
                  : "border-gray-200/80 shadow-sm"
              )
        )}
        style={
          !embedded && isDark ? ({ ["--pa-glow-soft"]: rgbaFromHex(accent, 0.25) } as CSSProperties) : undefined
        }
      >
        {!embedded && (
          <div
            className="h-1 w-full bg-[var(--public-accent)]"
            style={{ boxShadow: `0 0 20px ${rgbaFromHex(accent, 0.5)}` }}
          />
        )}
        <div className={embedded ? "min-w-0" : "p-6 xl:p-7"}>
          <p className={cn("text-[11px] font-bold uppercase tracking-widest mb-5", bookUi.muted)}>
            Seu agendamento
          </p>
          <div className="flex gap-4 mb-6">
            <div
              className={cn(
                "size-16 xl:size-[4.5rem] rounded-2xl overflow-hidden shrink-0 border border-black/5",
                isDark ? "bg-[#213428]" : "bg-gray-100",
                publicMediaTileClass
              )}
            >
              {(() => {
                const vars = normalizeVariantGallery(selectedService.variant_gallery);
                const pv = selectedVariantIndex != null ? vars[selectedVariantIndex] : undefined;
                const thumb = pv?.url || selectedService.image_url;
                if (thumb) {
                  return (
                    <Image src={thumb} alt="" width={72} height={72} className="size-full object-cover" unoptimized />
                  );
                }
                if (selectedService.emoji) {
                  return <span className={publicEmojiClass("lg")}>{selectedService.emoji}</span>;
                }
                return <span className={publicMaterialIconClass("xl")}>category</span>;
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("font-bold text-lg xl:text-xl leading-snug", bookUi.title)}>{selectedService.name}</p>
              {variantTitle ? (
                <p className={cn("text-xs font-semibold mt-1.5", bookUi.subtitle)}>{variantTitle}</p>
              ) : null}
              <p className={cn("text-sm mt-2", bookUi.subtitle)}>
                {selectedService.duration_minutes} min · {formatCurrency(priceCents / 100)}
              </p>
            </div>
          </div>

          <div className={cn("rounded-xl p-4 border space-y-4", bookUi.accentCard)}>
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", bookUi.muted)}>
                Profissional
              </p>
              <div className="flex items-center gap-3">
                {selectedCollab && selectedCollab !== "any" && selectedCollab.avatar_url ? (
                  <Image
                    src={selectedCollab.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover border border-white/10 shrink-0"
                    unoptimized
                  />
                ) : null}
                <p className={cn("text-sm font-semibold min-w-0", bookUi.title)}>
                  {selectedCollab === "any"
                    ? "Primeiro disponível na equipe"
                    : selectedCollab
                      ? selectedCollab.name
                      : "-"}
                </p>
              </div>
            </div>

            {dateLabel ? (
              <div>
                <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", bookUi.muted)}>Data</p>
                <p className={cn("text-sm font-semibold capitalize", bookUi.title)}>{dateLabel}</p>
              </div>
            ) : null}

            {selectedTime ? (
              <div>
                <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", bookUi.muted)}>Horário</p>
                <p className={cn("text-sm font-semibold tabular-nums", bookUi.title)}>{selectedTime}</p>
              </div>
            ) : null}
          </div>

          <p className={cn("text-xs leading-relaxed mt-6", bookUi.muted)}>{footerHint}</p>
        </div>
      </div>
    </aside>
  );
}
