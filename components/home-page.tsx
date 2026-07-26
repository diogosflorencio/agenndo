"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { LoginEntryLink } from "@/components/auth/login-entry-link";
import { HomeHeroNetworkBackground } from "@/components/home-hero-network-bg";
import { HomeFaqSection } from "@/components/home-faq-section";
import { HomeFooter } from "@/components/home-footer";
import { HomePhoneMockup } from "@/components/home-phone-mockup";
import { LandingLiveStatsProvider } from "@/components/landing-live-stats-context";
import { LandingStatEmbed } from "@/components/landing-stat-embed";
import { useI18n } from "@/components/i18n-provider";
import {
  HOME_FEATURE_GRID,
  HOME_INTEGRATIONS,
  HOME_PAIN_POINTS,
  HOME_PILLARS,
  HOME_SEGMENTS,
  HOME_STEPS,
} from "@/lib/landing/home-content";
import { APP_TRIAL_DAYS, trialDaysShortLabel } from "@/lib/trial-config";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors";

const btnPrimarySm = "inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors";

const HomePublicShowcase = dynamic(
  () => import("@/components/home-public-showcase").then((m) => ({ default: m.HomePublicShowcase })),
  { loading: () => <div className="min-h-[420px] bg-gray-50 border-y border-gray-200" aria-hidden /> }
);

const WhatsAppSupportWidget = dynamic(
  () => import("@/components/whatsapp-support-widget").then((m) => ({ default: m.WhatsAppSupportWidget })),
  { ssr: false }
);

function HomePageContent() {
  const { t } = useI18n();

  const trustLine = [
    t("common.noCardTrial"),
    trialDaysShortLabel(),
    t("landing.hero.trustBooking247"),
    t("landing.hero.trustMultiLang"),
    t("common.cancelAnytime"),
  ].join(" · ");

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20 md:pb-0">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">
            Agenndo
          </Link>
          <div className="flex items-center gap-3">
            <LoginEntryLink className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1">
              {t("common.login")}
            </LoginEntryLink>
            <LoginEntryLink className={btnPrimarySm}>{t("common.startFree")}</LoginEntryLink>
          </div>
        </div>
      </header>

      <section className="relative border-b border-gray-100 overflow-hidden min-h-[640px] md:min-h-[720px] lg:min-h-[780px]">
        <HomeHeroNetworkBackground />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-12 lg:gap-16 items-center">
            <div>
              <h1 id="hero-headline" className="text-[2rem] sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-gray-900 leading-[1.12]">
                {t("landing.hero.titleLine1")}
              </h1>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-emerald-700 tracking-tight">
                {t("landing.hero.titleLine2")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <LandingStatEmbed stat="activePros" />
                <LandingStatEmbed stat="bookingsToday" />
              </div>

              <p id="hero-summary" className="mt-6 text-base md:text-[17px] text-gray-600 leading-relaxed max-w-xl">
                {t("landing.hero.summary")}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                <LoginEntryLink className={btnPrimary}>{t("landing.hero.ctaPrimary")}</LoginEntryLink>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md">{trustLine}</p>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Quer ver antes?{" "}
                <Link href="#demonstracao" className="text-gray-800 underline underline-offset-2 hover:text-emerald-700">
                  Exemplos de páginas públicas
                </Link>
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HomePhoneMockup large />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16 px-4 sm:px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight mb-3">
              {t("landing.pain.title")}
            </h2>
            <p className="text-gray-600 text-sm md:text-base">{t("landing.pain.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {HOME_PAIN_POINTS.map((item) => (
              <article key={item.problem} className="rounded-lg border border-gray-200 bg-white p-6">
                <span className="material-symbols-outlined text-emerald-700 text-2xl mb-3">{item.icon}</span>
                <p className="text-sm font-semibold text-gray-900 mb-2">{item.problem}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.solution}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HomePublicShowcase />

      <section id="funcionalidades" className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">
              Tudo para encher a agenda - da vitrine ao caixa
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Não é só um link de agendamento: operação completa para qualquer serviço com hora marcada.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {HOME_PILLARS.map((pillar) => (
              <article key={pillar.title} className="rounded-lg border border-gray-200 p-6">
                <span className="material-symbols-outlined text-emerald-700 text-xl mb-3">{pillar.icon}</span>
                <h3 className="font-semibold text-gray-900 mb-2">{pillar.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{pillar.desc}</p>
              </article>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HOME_FEATURE_GRID.map((f) => (
              <div key={f.title} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                <h3 className="font-medium text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-14 md:py-16 px-4 sm:px-6 bg-gray-50 border-y border-gray-100 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">Como funciona</h2>
          <p className="text-gray-600 text-sm md:text-base mb-10 max-w-xl">
            Três passos para publicar sua página e receber reservas pelo link.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {HOME_STEPS.map((step) => (
              <article key={step.n} className="bg-white border border-gray-200 rounded-lg p-6">
                <p className="text-sm font-bold text-emerald-700 mb-2">Passo {step.n}</p>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="segmentos" className="py-14 md:py-16 px-4 sm:px-6 bg-white border-t border-gray-100 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">{t("landing.segments.title")}</h2>
          <div className="flex flex-wrap gap-2">
            {HOME_SEGMENTS.map((seg) => (
              <Link
                key={`${seg.href}-${seg.label}`}
                href={seg.href}
                className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3.5 py-2 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                {seg.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16 px-4 sm:px-6 bg-white border-t border-gray-100" aria-label="Integrações">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-8">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">{t("landing.integrations.title")}</h2>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">{t("landing.integrations.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {HOME_INTEGRATIONS.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3.5 py-2 bg-gray-50/50"
              >
                <span className="material-symbols-outlined text-base text-gray-500">{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <HomeFaqSection />

      <HomeFooter tagline={t("landing.footerTagline")} />

      <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 border-t border-gray-200 md:hidden">
        <LoginEntryLink className={`${btnPrimary} w-full`}>
          {t("landing.mobileCta", { days: APP_TRIAL_DAYS })}
        </LoginEntryLink>
      </div>

      <WhatsAppSupportWidget context="landing" />
    </div>
  );
}

export default function HomePage() {
  return (
    <LandingLiveStatsProvider>
      <HomePageContent />
    </LandingLiveStatsProvider>
  );
}
