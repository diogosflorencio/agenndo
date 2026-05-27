"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PublicPageInner } from "../../page";

function AgendarStepContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const step = typeof params?.step === "string" ? params.step : "servico";
  const prefillServiceId = searchParams.get("service");

  if (!slug) {
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
      prefillServiceId={prefillServiceId}
    />
  );
}

export default function AgendarStepPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <AgendarStepContent />
    </Suspense>
  );
}
