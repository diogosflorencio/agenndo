"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PublicPageInner } from "@/components/public/public-slug-page";
import { parsePublicBookingQuery } from "@/lib/public-booking-query";

function AgendarBookingShell() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const step = typeof params?.step === "string" ? params.step : null;
  const bookingQuery = parsePublicBookingQuery(searchParams);

  if (!slug || !step) {
    return (
      <div className="min-h-screen bg-[#020403] flex items-center justify-center">
        <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PublicPageInner
      entry="booking"
      bookingStepSegment={step}
      prefillServiceId={bookingQuery.serviceId}
      prefillCollaboratorId={bookingQuery.collaboratorId}
      prefillDate={bookingQuery.date}
      prefillTime={bookingQuery.time}
    />
  );
}

/**
 * Shell único do fluxo de agendamento: não remonta o wizard a cada /agendar/[step].
 * A página [step] só existe para o segmento na URL (retorna null).
 */
export default function AgendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <AgendarBookingShell />
      {children}
    </Suspense>
  );
}
