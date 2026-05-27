"use client";

import { Suspense } from "react";
import { PublicPageInner } from "@/components/public/public-slug-page";

export default function PublicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <PublicPageInner entry="home" />
    </Suspense>
  );
}
