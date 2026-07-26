"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PUBLIC_SHOWCASE_SLIDES, type PublicShowcaseSlide } from "@/lib/landing/public-showcase-data";
import { cn } from "@/lib/utils";

function MockVitrine() {
  return (
    <div className="bg-gray-50 min-h-[280px] p-4 space-y-3">
      <div className="h-20 rounded-lg bg-gradient-to-r from-gray-200 to-gray-100" />
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gray-200 shrink-0" />
        <div className="min-w-0">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-2 w-24 bg-gray-100 rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Corte", "Barba", "Combo", "Sobrancelha"].map((s) => (
          <div key={s} className="rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-medium text-gray-700">
            {s}
          </div>
        ))}
      </div>
      <div className="h-9 rounded-lg bg-emerald-600/90 text-center text-xs font-semibold text-white leading-9">
        Agendar
      </div>
    </div>
  );
}

function MockAgendar() {
  return (
    <div className="bg-white min-h-[280px] p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900">Escolha o horário</p>
      <div className="grid grid-cols-3 gap-2">
        {["09:00", "10:30", "14:00", "15:30", "16:00"].map((t, i) => (
          <div
            key={t}
            className={cn(
              "rounded-md border py-2 text-center text-xs font-medium",
              i === 2 ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700"
            )}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 p-3 space-y-1.5 text-xs text-gray-600">
        <p>
          <span className="font-semibold text-gray-900">Serviço:</span> Corte masculino
        </p>
        <p>
          <span className="font-semibold text-gray-900">Profissional:</span> Marcos
        </p>
      </div>
    </div>
  );
}

function MockPainel() {
  return (
    <div className="bg-[#0f1412] min-h-[280px] p-4 space-y-2 text-white">
      <p className="text-xs text-emerald-400/90 font-medium mb-2">Próximos hoje</p>
      {[
        { t: "09:00", n: "Cliente A" },
        { t: "11:30", n: "Cliente B" },
        { t: "14:00", n: "Cliente C" },
      ].map((r) => (
        <div key={r.t} className="flex gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <span className="text-sm font-semibold tabular-nums text-emerald-400">{r.t}</span>
          <span className="text-sm">{r.n}</span>
        </div>
      ))}
    </div>
  );
}

function SlidePreview({ slide }: { slide: PublicShowcaseSlide }) {
  if (slide.image) {
    return (
      <Image
        src={slide.image}
        alt={`Página pública ${slide.businessName}`}
        width={800}
        height={560}
        className="w-full h-auto object-cover object-top"
        unoptimized
      />
    );
  }
  if (slide.mock === "agendar") return <MockAgendar />;
  if (slide.mock === "painel") return <MockPainel />;
  return <MockVitrine />;
}

export function HomePublicShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = PUBLIC_SHOWCASE_SLIDES[index] ?? PUBLIC_SHOWCASE_SLIDES[0];

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % PUBLIC_SHOWCASE_SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused || PUBLIC_SHOWCASE_SLIDES.length <= 1) return;
    const id = window.setInterval(next, 6000);
    return () => window.clearInterval(id);
  }, [paused, next]);

  return (
    <section id="demonstracao" className="py-16 md:py-20 bg-gray-50 border-y border-gray-200 px-4 sm:px-6 scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Páginas reais</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight mb-3">
            Veja como fica na prática
          </h2>
          <p className="text-gray-600 text-sm md:text-base leading-relaxed">
            Cada negócio ganha uma página pública com sua marca. O cliente agenda pelo celular; você gerencia no painel.
          </p>
        </div>

        <div
          className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-8 lg:gap-12 items-start"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-gray-300" />
                <span className="size-2.5 rounded-full bg-gray-300" />
                <span className="size-2.5 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 h-7 rounded-md bg-white border border-gray-200 px-2 flex items-center min-w-0">
                <span className="text-[11px] text-gray-500 truncate">
                  agenndo.com.br/{slide.businessName.toLowerCase().replace(/\s+/g, "-")}
                </span>
              </div>
            </div>
            <SlidePreview slide={slide} />
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-emerald-700 mb-1">{slide.segment}</p>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{slide.businessName}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{slide.description}</p>
            </div>

            {slide.liveUrl ? (
              <Link
                href={slide.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:underline"
              >
                Abrir página ao vivo
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </Link>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + PUBLIC_SHOWCASE_SLIDES.length) % PUBLIC_SHOWCASE_SLIDES.length)}
                className="size-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                aria-label="Anterior"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={next}
                className="size-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                aria-label="Próximo"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
              <div className="flex gap-1.5">
                {PUBLIC_SHOWCASE_SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                    )}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-400">Troca automática a cada 6s · pausa ao passar o mouse</p>
          </div>
        </div>
      </div>
    </section>
  );
}
