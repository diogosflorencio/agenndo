"use client";

import Link from "next/link";
import { cn, rgbaFromHex } from "@/lib/utils";
import { publicMaterialIconClass, type getPublicBookUi } from "@/lib/public-book-ui";
import { PublicBookingSummaryAside } from "@/components/public/booking-summary-aside";
import { PublicBookingSplitLayout } from "@/components/public/booking-split-layout";

type CollabRow = { id: string; name: string; role: string | null; avatar_url: string | null };

type ServiceRow = {
  name: string;
  duration_minutes: number;
  emoji: string | null;
  image_url: string | null;
  variant_gallery: unknown;
};

type Props = {
  slug: string;
  bookUi: ReturnType<typeof getPublicBookUi>;
  isDark: boolean;
  accent: string;
  selectedService: ServiceRow;
  selectedVariantIndex: number | null;
  selectedCollab: CollabRow | "any" | null;
  selectedDate: string | null;
  selectedTime: string | null;
  priceCents: number;
  clientName: string;
  setClientName: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  authUserId: string | null;
  authUserName: string | null;
  bookError: string | null;
  bookingSubmitting: boolean;
  minAdvanceHours: number | null | undefined;
  onConfirm: () => void;
};

export function PublicBookingConfirmStep({
  slug,
  bookUi,
  isDark,
  accent,
  selectedService,
  selectedVariantIndex,
  selectedCollab,
  selectedDate,
  selectedTime,
  priceCents,
  clientName,
  setClientName,
  notes,
  setNotes,
  authUserId,
  authUserName,
  bookError,
  bookingSubmitting,
  minAdvanceHours,
  onConfirm,
}: Props) {
  return (
    <PublicBookingSplitLayout
      bookUi={bookUi}
      isDark={isDark}
      accent={accent}
      title="Confirmar agendamento"
      subtitle="Revise os detalhes e informe seu nome"
      left={
        <div className="space-y-5">
          {/* Nome do cliente */}
          <div>
            <label className={cn("text-sm font-medium block mb-2", bookUi.label)}>
              Seu nome <span className={bookUi.muted}>(obrigatório)</span>
            </label>
            {authUserId && authUserName ? (
              <div className="space-y-2">
                <div
                  className={cn(
                    "flex items-center gap-3 h-11 border rounded-xl px-4 text-sm",
                    bookUi.input
                  )}
                >
                  <span className={cn("material-symbols-outlined text-base text-[var(--public-accent)]")}>person</span>
                  <span className={cn("flex-1 font-medium truncate", bookUi.title)}>{clientName || authUserName}</span>
                  <span className={cn("text-[10px] uppercase tracking-wide font-semibold text-[var(--public-accent)]")}>
                    Logado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/entrar?slug=${encodeURIComponent(slug)}&switch=1`}
                    className={cn(
                      "text-xs font-semibold flex items-center gap-1 hover:underline",
                      isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    Trocar login
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Como quer ser chamado(a)"
                  className={cn(
                    "w-full h-11 border focus:border-[var(--public-accent)] rounded-xl px-4 outline-none transition-colors text-sm",
                    bookUi.input
                  )}
                />
                <div className="flex items-center gap-2">
                  <Link
                    href={`/entrar?slug=${encodeURIComponent(slug)}`}
                    className={cn(
                      "text-xs font-semibold flex items-center gap-1 hover:underline",
                      isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Crie uma conta ou faça login (opcional)
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={cn("text-sm font-medium block mb-2", bookUi.label)}>
              Observações <span className={bookUi.muted}>(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: acessibilidade, acompanhante, detalhes do serviço ou do atendimento..."
              rows={3}
              className={cn(
                "w-full border focus:border-[var(--public-accent)] rounded-xl px-4 py-3 outline-none transition-colors text-sm resize-none",
                bookUi.input
              )}
            />
          </div>

          {!authUserId && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className={cn(publicMaterialIconClass("sm", false), "text-amber-500 self-center")}>info</span>
              <p className={cn("text-xs leading-relaxed", isDark ? "text-amber-200" : "text-amber-900")}>
                Você pode agendar sem criar conta: basta informar seu nome. Com conta de cliente você acompanha histórico
                e cancelamentos em{" "}
                <Link href="/conta" className="font-semibold text-[var(--public-accent)] hover:underline">
                  Minha conta
                </Link>
                .
              </p>
            </div>
          )}

          {bookError && (
            <div
              className={cn(
                "p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-sm",
                isDark ? "text-red-300" : "text-red-700"
              )}
            >
              {bookError}
            </div>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={!clientName.trim() || bookingSubmitting}
            style={{ boxShadow: `0 0 20px ${rgbaFromHex(accent, 0.3)}` }}
            className="w-full py-4 bg-[var(--public-accent)] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2"
          >
            <span className={publicMaterialIconClass("lg", false)}>check_circle</span>
            {bookingSubmitting ? "Confirmando…" : "Confirmar agendamento"}
          </button>

          <p className={cn("text-xs text-center", bookUi.muted)}>
            {minAdvanceHours != null
              ? `Cancelamento com pelo menos ${minAdvanceHours}h de antecedência (quando permitido pelo negócio).`
              : "Cancelamento com antecedência mínima configurada pelo negócio."}
          </p>
        </div>
      }
      right={
        <PublicBookingSummaryAside
          embedded
          selectedService={selectedService}
          selectedVariantIndex={selectedVariantIndex}
          selectedCollab={selectedCollab}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          priceCents={priceCents}
          isDark={isDark}
          accent={accent}
          bookUi={bookUi}
          footerHint="Confira serviço, profissional, data e horário antes de confirmar. Você pode voltar para ajustar qualquer passo."
        />
      }
    />
  );
}
