"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback, useMemo, Suspense, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency, rgbaFromHex } from "@/lib/utils";
import { recordPublicPageVisit } from "@/lib/visited-public-pages";
import {
  collectAvailableStartMinutes,
  isDateOpenForPublicBooking,
  isPublicStartMinuteBookable,
  publicSlotReasonLabel,
  type AvailabilityDbRow,
  type OverrideDbRow,
  type PublicSlotCell,
} from "@/lib/public-booking";
import { PublicBookingDayTimeline, type PublicDayTimelinePayload } from "@/components/public-booking-day-timeline";
import { PublicPwaInstallPrompt } from "@/components/public-pwa-install-prompt";
import { minutesToTime, timeToMinutes, type DaySchedule } from "@/lib/disponibilidade";

function initialSliderStartMin(payload: PublicDayTimelinePayload): number {
  const now = new Date();
  const available = collectAvailableStartMinutes({
    dateStr: payload.dateStr,
    schedule: payload.schedule as DaySchedule,
    durationMinutes: payload.durationMinutes,
    bufferMinutes: payload.bufferMinutes,
    collaboratorId: payload.viewCollaboratorId,
    appointments: payload.appointments,
    blocks: payload.blocks,
    minAdvanceHours: payload.minAdvanceHours,
    now,
  });
  if (payload.suggestedStartMin != null && available.has(payload.suggestedStartMin)) {
    return payload.suggestedStartMin;
  }
  const sorted = Array.from(available).sort((a, b) => a - b);
  if (sorted.length > 0) return sorted[0]!;
  return timeToMinutes(payload.schedule.start);
}

function localISODate(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Step = 1 | 2 | 3 | 4 | 5;
type PageView = "home" | "booking";

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  primary_color: string | null;
  segment: string | null;
  logo_url: string | null;
};
type PersonalizationRow = {
  banner_url: string | null;
  gallery_urls: string[] | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  tagline: string | null;
  about: string | null;
  public_theme: string | null;
  show_whatsapp_fab: boolean | null;
  address_line: string | null;
};
type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
  collaborator_services: { collaborator_id: string }[];
};
type CollabRow = { id: string; name: string; role: string | null; color: string | null };

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function PublicPageInner() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [personalization, setPersonalization] = useState<PersonalizationRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<PageView>("home");
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<CollabRow | "any" | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState(false);
  const [clientName, setClientName] = useState("");

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [bookingMeta, setBookingMeta] = useState<{
    maxFutureDays: number;
    minAdvanceHours: number;
    bufferMinutes: number;
    publicBookingTimeUi: "slider" | "blocks";
    publicBookingLocked?: boolean;
    publicBookingLockMessage?: string | null;
    weeklyAvailability: AvailabilityDbRow[];
    availabilityOverrides: OverrideDbRow[];
  } | null>(null);
  const [slotTimeline, setSlotTimeline] = useState<PublicSlotCell[]>([]);
  const [dayTimeline, setDayTimeline] = useState<PublicDayTimelinePayload | null>(null);
  const [sliderStartMin, setSliderStartMin] = useState(9 * 60);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookedCollabName, setBookedCollabName] = useState<string | null>(null);
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    (async () => {
      try {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, name, slug, city, phone, primary_color, segment, logo_url")
          .eq("slug", slug)
          .single();
        if (!biz) {
          setPersonalization(null);
          setLoading(false);
          return;
        }
        setBusiness(biz as BusinessRow);
        const bid = (biz as BusinessRow).id;
        const [sRes, cRes, pRes] = await Promise.all([
          supabase
            .from("services")
            .select("id, name, duration_minutes, price_cents, emoji, collaborator_services(collaborator_id)")
            .eq("business_id", bid)
            .eq("active", true),
          supabase.from("collaborators").select("id, name, role, color").eq("business_id", bid).eq("active", true),
          supabase
            .from("personalization")
            .select(
              "banner_url, gallery_urls, instagram_url, facebook_url, whatsapp_number, tagline, about, public_theme, show_whatsapp_fab, address_line"
            )
            .eq("business_id", bid)
            .maybeSingle(),
        ]);
        setServices((sRes.data as ServiceRow[]) ?? []);
        setCollaborators((cRes.data as CollabRow[]) ?? []);
        setPersonalization((pRes.data as PersonalizationRow) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    const s = business?.slug;
    const n = business?.name;
    if (!s || !n) return;
    recordPublicPageVisit(s, n);
  }, [business?.slug, business?.name]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/booking-meta?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j && typeof j.maxFutureDays === "number") {
          const weeklyRaw = Array.isArray(j.weeklyAvailability) ? j.weeklyAvailability : [];
          const overridesRaw = Array.isArray(j.availabilityOverrides) ? j.availabilityOverrides : [];
          setBookingMeta({
            maxFutureDays: j.maxFutureDays,
            minAdvanceHours: typeof j.minAdvanceHours === "number" ? j.minAdvanceHours : 0,
            bufferMinutes: typeof j.bufferMinutes === "number" ? j.bufferMinutes : 0,
            publicBookingTimeUi: j.publicBookingTimeUi === "blocks" ? "blocks" : "slider",
            publicBookingLocked: j.publicBookingLocked === true,
            publicBookingLockMessage:
              typeof j.publicBookingLockMessage === "string" ? j.publicBookingLockMessage : null,
            weeklyAvailability: weeklyRaw as AvailabilityDbRow[],
            availabilityOverrides: overridesRaw.map((o: Record<string, unknown>) => ({
              date:
                typeof o.date === "string"
                  ? o.date.slice(0, 10)
                  : String(o.date ?? "").slice(0, 10),
              closed: Boolean(o.closed),
              open_time: (o.open_time as string | null) ?? null,
              close_time: (o.close_time as string | null) ?? null,
              breaks: o.breaks ?? [],
            })) as OverrideDbRow[],
          });
        }
      })
      .catch(() =>
        setBookingMeta({
          maxFutureDays: 30,
          minAdvanceHours: 0,
          bufferMinutes: 0,
          publicBookingTimeUi: "slider",
          publicBookingLocked: false,
          weeklyAvailability: [],
          availabilityOverrides: [],
        })
      );
  }, [slug]);

  useEffect(() => {
    if (!bookingMeta || !selectedDate) return;
    if (
      !isDateOpenForPublicBooking(
        selectedDate,
        bookingMeta.weeklyAvailability,
        bookingMeta.availabilityOverrides
      )
    ) {
      setSelectedTime(null);
      setSelectedDate(null);
      if (step >= 4) setStep(3);
    }
  }, [bookingMeta, selectedDate, step]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view !== "booking" || step !== 4 || !business || !selectedService || !selectedDate || !slug) {
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    const collabParam =
      selectedCollab && selectedCollab !== "any" ? selectedCollab.id : "any";
    const q = new URLSearchParams({
      slug,
      date: selectedDate,
      serviceId: selectedService.id,
      collaboratorId: collabParam,
    });
    fetch(`/api/public/slots?${q}`)
      .then(async (r) => {
        const j = (await r.json()) as {
          slots?: string[];
          timeline?: PublicSlotCell[];
          dayTimeline?: PublicDayTimelinePayload | null;
          error?: string;
        };
        if (!r.ok) throw new Error(j.error || "Erro ao carregar horários");
        let timeline: PublicSlotCell[];
        if (Array.isArray(j.timeline) && j.timeline.length > 0) {
          timeline = j.timeline.filter(
            (c): c is PublicSlotCell =>
              Boolean(c) &&
              typeof c === "object" &&
              typeof (c as PublicSlotCell).start === "string" &&
              typeof (c as PublicSlotCell).available === "boolean" &&
              typeof (c as PublicSlotCell).reason === "string"
          );
        } else {
          const slots = Array.isArray(j.slots) ? j.slots : [];
          timeline = slots.map((s) => ({
            start: String(s).slice(0, 5),
            available: true,
            reason: "livre" as const,
          }));
        }
        let nextDayTl: PublicDayTimelinePayload | null = null;
        const raw = j.dayTimeline;
        if (
          raw &&
          typeof raw === "object" &&
          raw.schedule?.active &&
          raw.viewCollaboratorId &&
          raw.dateStr === selectedDate
        ) {
          nextDayTl = raw as PublicDayTimelinePayload;
        }
        return { timeline, dayTimeline: nextDayTl };
      })
      .then(({ timeline, dayTimeline: nextDay }) => {
        if (!cancelled) {
          setSlotTimeline(timeline);
          setDayTimeline(nextDay);
          if (nextDay) setSliderStartMin(initialSliderStartMin(nextDay));
          else setSliderStartMin(9 * 60);
          setSlotsLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setSlotsError(e.message);
          setSlotTimeline([]);
          setDayTimeline(null);
          setSlotsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view, step, business?.id, selectedService?.id, selectedDate, selectedCollab, slug]);

  const resetBookingForm = useCallback(() => {
    setStep(1);
    setSelectedService(null);
    setSelectedCollab(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes("");
    setClientName("");
    setBookError(null);
    setSlotTimeline([]);
    setDayTimeline(null);
    setSliderStartMin(9 * 60);
    setSlotsError(null);
  }, []);

  const goHome = useCallback(() => {
    setView("home");
    resetBookingForm();
  }, [resetBookingForm]);

  const bookingBlocked = bookingMeta?.publicBookingLocked === true;

  useEffect(() => {
    if (bookingMeta?.publicBookingLocked && view === "booking") {
      setView("home");
      resetBookingForm();
    }
  }, [bookingMeta?.publicBookingLocked, view, resetBookingForm]);

  const startBooking = useCallback(
    (prefillService?: ServiceRow | null) => {
      if (bookingMeta?.publicBookingLocked) return;
      setBooked(false);
      setBookedCollabName(null);
      resetBookingForm();
      setView("booking");
      if (prefillService) {
        setSelectedService(prefillService);
        setStep(2);
      }
    },
    [resetBookingForm, bookingMeta?.publicBookingLocked]
  );

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDay(calYear, calMonth);

  const maxFutureDays = bookingMeta?.maxFutureDays ?? 30;
  const limitDate = new Date(today);
  limitDate.setHours(0, 0, 0, 0);
  limitDate.setDate(limitDate.getDate() + maxFutureDays);

  const slotGroups = (() => {
    const morning = slotTimeline.filter((c) => Number(c.start.split(":")[0]) < 12);
    const afternoon = slotTimeline.filter((c) => {
      const h = Number(c.start.split(":")[0]);
      return h >= 12 && h < 17;
    });
    const evening = slotTimeline.filter((c) => Number(c.start.split(":")[0]) >= 17);
    return [
      { label: "Manhã", icon: "wb_sunny" as const, cells: morning },
      { label: "Tarde", icon: "wb_twilight" as const, cells: afternoon },
      { label: "Noite", icon: "nightlight" as const, cells: evening },
    ].filter((g) => g.cells.length > 0);
  })();

  const sliderPositionValid = useMemo(() => {
    if (!dayTimeline) return false;
    return isPublicStartMinuteBookable({
      startMinute: sliderStartMin,
      dateStr: dayTimeline.dateStr,
      schedule: dayTimeline.schedule as DaySchedule,
      durationMinutes: dayTimeline.durationMinutes,
      bufferMinutes: dayTimeline.bufferMinutes,
      collaboratorId: dayTimeline.viewCollaboratorId,
      appointments: dayTimeline.appointments,
      blocks: dayTimeline.blocks,
      minAdvanceHours: dayTimeline.minAdvanceHours,
      now: new Date(),
    });
  }, [dayTimeline, sliderStartMin]);

  const handleBook = async () => {
    if (bookingBlocked || !business || !selectedService || !selectedDate || !selectedTime || !clientName.trim() || !slug)
      return;
    setBookingSubmitting(true);
    setBookError(null);
    try {
      const collaboratorId =
        selectedCollab && selectedCollab !== "any" ? selectedCollab.id : "any";
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          serviceId: selectedService.id,
          collaboratorId,
          date: selectedDate,
          timeStart: selectedTime,
          clientName: clientName.trim(),
          notes,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Não foi possível concluir o agendamento");
      setBookedCollabName(typeof j.collaboratorName === "string" ? j.collaboratorName : null);
      setBooked(true);
    } catch (e) {
      setBookError(e instanceof Error ? e.message : "Erro ao agendar");
    } finally {
      setBookingSubmitting(false);
    }
  };

  /** Sem vínculos em collaborator_services = qualquer profissional ativo. Com vínculos = só os marcados. */
  const collabForService = selectedService
    ? (() => {
        const links = selectedService.collaborator_services ?? [];
        if (links.length === 0) return collaborators;
        const ids = new Set(links.map((l) => l.collaborator_id));
        return collaborators.filter((c) => ids.has(c.id));
      })()
    : collaborators;

  const accent = business?.primary_color?.trim() || "#13EC5B";
  const phoneDigits = (business?.phone ?? personalization?.whatsapp_number ?? "").replace(/\D/g, "") || "";
  const waHref = phoneDigits ? `https://wa.me/55${phoneDigits}` : "#";
  const isDark = personalization?.public_theme !== "light";
  const showWhatsappFab = personalization?.show_whatsapp_fab !== false;
  const galleryList = Array.isArray(personalization?.gallery_urls) ? personalization.gallery_urls : [];
  const displayAddress = personalization?.address_line?.trim() || business?.city || "";

  const bookUi = {
    page: isDark ? "min-h-screen bg-[#020403]" : "min-h-screen bg-gray-100",
    header: isDark ? "border-white/5 bg-[#080c0a]/90" : "border-gray-200 bg-white/90",
    sticky: isDark ? "bg-[#020403]/95 border-white/5" : "bg-gray-50/95 border-gray-200",
    title: isDark ? "text-white" : "text-gray-900",
    subtitle: isDark ? "text-gray-400" : "text-gray-600",
    muted: isDark ? "text-gray-500" : "text-gray-500",
    card: isDark ? "border-[#213428] bg-[#14221A]" : "border-gray-200 bg-white",
    cardHover: isDark ? "hover:border-white/20" : "hover:border-gray-300",
    input: isDark
      ? "bg-[#14221A] border-[#213428] text-white placeholder-gray-600"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400",
    bottomBar: isDark ? "bg-[#020403]/95 border-white/5" : "bg-white/95 border-gray-200",
    stepIdle: isDark ? "bg-white/5 text-gray-500" : "bg-gray-200 text-gray-500",
    stepLine: isDark ? "bg-white/10" : "bg-gray-200",
    label: isDark ? "text-gray-300" : "text-gray-700",
    chip: isDark ? "bg-[#14221A] border-[#213428]" : "bg-gray-50 border-gray-200",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center">
        <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-white mb-2">Página não encontrada</h1>
        <p className="text-gray-400 text-sm mb-4">Este link de agendamento não existe ou foi alterado.</p>
        <Link href="/" className="text-primary font-semibold hover:underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (booked) {
    return (
      <SuccessScreen
        service={selectedService}
        collab={selectedCollab}
        date={selectedDate}
        time={selectedTime}
        slug={slug}
        businessName={business.name}
        collaboratorName={bookedCollabName}
        accentColor={accent}
      />
    );
  }

  if (view === "home") {
    const hasBanner = Boolean(personalization?.banner_url);
    const titleCls = isDark ? "text-white" : "text-gray-900";
    const subCls = isDark ? "text-gray-400" : "text-gray-600";
    const mutedCls = isDark ? "text-gray-500" : "text-gray-500";
    const cardCls = isDark ? "bg-[#14221A] border border-[#213428]" : "bg-white border border-gray-200";
    const cardHover = isDark ? "hover:border-white/25" : "hover:border-gray-300";
    const avatarBorder = isDark ? "border-[#020403]" : "border-gray-50";
    const floatBtn =
      "text-xs font-semibold px-3.5 py-2 rounded-full bg-black/45 backdrop-blur-md text-white border border-white/25 shadow-lg hover:bg-black/55 transition-colors";

    return (
      <div className={cn("min-h-screen", isDark ? "bg-[#020403] text-white" : "bg-gray-50 text-gray-900")}>
        <div
          className={cn("fixed inset-0 pointer-events-none", isDark ? "opacity-[0.12]" : "opacity-[0.06]")}
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${accent}, transparent)`,
          }}
        />

        {/* Banner: mobile edge-to-edge; desktop card com cantos e sombra; avatar z-30 sobre o banner */}
        <div className="relative z-20 w-full">
          <div className="w-full lg:max-w-7xl lg:mx-auto lg:px-8 lg:pt-4">
            {/* Wrapper sem overflow: o avatar com translate-y-1/2 fica FORA do retângulo do banner (evita clip). */}
            <div className="relative w-full">
              <div
                className={cn(
                  "relative w-full overflow-hidden isolate",
                  "h-[min(42vw,200px)] sm:h-52 lg:h-72",
                  "lg:rounded-2xl lg:ring-1",
                  isDark
                    ? "lg:ring-white/[0.1] lg:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)]"
                    : "lg:ring-black/[0.07] lg:shadow-[0_20px_44px_-10px_rgba(0,0,0,0.18)]"
                )}
              >
                {hasBanner && personalization?.banner_url ? (
                  <Image
                    src={personalization.banner_url}
                    alt=""
                    fill
                    className="object-cover"
                    priority
                    sizes="100vw"
                    unoptimized
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(145deg, ${accent}35 0%, ${isDark ? "#0a120e" : "#e8f5ef"} 55%, ${isDark ? "#020403" : "#f3f4f6"} 100%)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/30 via-black/5 to-transparent pointer-events-none" />

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[25] flex items-center gap-2 pr-[max(0px,env(safe-area-inset-right))] pt-[max(0px,env(safe-area-inset-top))]">
                  {authUserId && (
                    <Link href="/conta" className={floatBtn}>
                      Minha conta
                    </Link>
                  )}
                  {!authUserId && (
                    <Link href={`/entrar?slug=${encodeURIComponent(slug)}`} className={floatBtn}>
                      Entrar
                    </Link>
                  )}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 z-[100] pointer-events-none">
                <div className="max-w-3xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative h-0 w-full">
                  <div
                    className={cn(
                      "absolute bottom-0 left-0.2 z-[100] translate-y-1/2 pointer-events-auto",
                      "size-[5.5rem] sm:size-28 rounded-2xl border-4 shadow-xl overflow-hidden flex items-center justify-center text-3xl sm:text-4xl font-bold text-black",
                      avatarBorder
                    )}
                    style={{
                      backgroundColor: business.logo_url ? undefined : accent,
                      boxShadow: `0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.15)`,
                    }}
                  >
                    {business.logo_url ? (
                      <Image
                        src={business.logo_url}
                        alt=""
                        width={112}
                        height={112}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      business.name[0]?.toUpperCase() ?? "A"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* pt compensa metade do avatar (translate-y-1/2) para o texto começar abaixo da foto, sem coluna ao lado */}
        <main className="relative z-[5] max-w-3xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 pt-[3.25rem] sm:pt-[4.25rem]">
          {bookingBlocked && (
            <div
              className={cn(
                "mb-6 rounded-xl border p-4 text-sm",
                isDark ? "border-amber-500/35 bg-amber-950/35 text-amber-50" : "border-amber-300 bg-amber-50 text-amber-950"
              )}
            >
              <p className="font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">event_busy</span>
                Agendamento online pausado
              </p>
              <p className="mt-2 opacity-95 leading-relaxed text-[13px]">
                {bookingMeta?.publicBookingLockMessage ??
                  "Este negócio não está aceitando novos agendamentos pelo site no momento."}
              </p>
              {Boolean((business.phone ?? "").replace(/\D/g, "") || personalization?.whatsapp_number) && (
                <p className="mt-2 text-xs opacity-90">Use o telefone ou WhatsApp desta página para falar com o negócio.</p>
              )}
            </div>
          )}
          <section className="mb-10 lg:mb-12">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10 xl:gap-14 w-full min-w-0">
              <div className="min-w-0 flex-1 space-y-3 lg:space-y-4 w-full">
                <div>
                  <h1
                    className={cn(
                      "font-extrabold tracking-tight text-2xl sm:text-3xl lg:text-4xl xl:text-[2.5rem] leading-tight",
                      titleCls
                    )}
                  >
                    {business.name}
                  </h1>
                  {personalization?.tagline?.trim() && (
                    <p
                      className={cn(
                        "mt-2 sm:mt-2.5 text-sm sm:text-base lg:text-lg font-medium leading-relaxed max-w-2xl xl:max-w-3xl",
                        subCls
                      )}
                    >
                      {personalization.tagline.trim()}
                    </p>
                  )}
                  {business.segment && (
                    <p
                      className={cn(
                        "mt-2 inline-flex items-center text-xs sm:text-sm font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg",
                        isDark ? "bg-white/10 text-gray-300" : "bg-gray-200/80 text-gray-700"
                      )}
                    >
                      {business.segment}
                    </p>
                  )}
                </div>
                {(displayAddress || business.phone) && (
                  <div
                    className={cn(
                      "flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-x-5 sm:gap-y-2 text-xs sm:text-sm",
                      mutedCls
                    )}
                  >
                    {displayAddress && (
                      <span className="inline-flex items-start gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-base shrink-0 mt-0.5">location_on</span>
                        <span className="leading-snug">{displayAddress}</span>
                      </span>
                    )}
                    {business.phone && (
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <span className="material-symbols-outlined text-base">call</span>
                        {business.phone}
                      </span>
                    )}
                  </div>
                )}
                {(personalization?.instagram_url || personalization?.facebook_url) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {personalization.instagram_url && (
                      <a
                        href={personalization.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors",
                          isDark ? "border-white/15 hover:bg-white/5" : "border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        Instagram
                      </a>
                    )}
                    {personalization.facebook_url && (
                      <a
                        href={personalization.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors",
                          isDark ? "border-white/15 hover:bg-white/5" : "border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        Facebook
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex flex-col gap-2 w-full lg:w-auto lg:min-w-[240px] lg:max-w-[280px] lg:items-stretch xl:min-w-[260px]">
                <button
                  type="button"
                  disabled={bookingBlocked}
                  onClick={() => startBooking()}
                  className={cn(
                    "w-full lg:w-full px-8 py-4 rounded-xl font-bold text-black text-base shadow-lg transition-transform",
                    bookingBlocked ? "opacity-50 cursor-not-allowed grayscale" : "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                  style={{ backgroundColor: accent, boxShadow: `0 0 28px ${accent}55` }}
                >
                  Novo agendamento
                </button>
                <p className={cn("text-xs leading-relaxed lg:text-right", mutedCls)}>
                  {bookingBlocked ? "Agendamento pelo site indisponível no momento" : "Escolha serviço, profissional, data e horário"}
                </p>
              </div>
            </div>
          </section>

          {personalization?.about?.trim() && (
            <section className="mb-10">
              <h2 className={cn("text-sm font-bold uppercase tracking-wider mb-3", subCls)}>Sobre</h2>
              <p className={cn("text-sm leading-relaxed rounded-2xl p-4", cardCls)}>{personalization.about.trim()}</p>
            </section>
          )}

          {galleryList.length > 0 && (
            <section className="mb-10">
              <h2 className={cn("text-sm font-bold uppercase tracking-wider mb-3", subCls)}>Galeria</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                {galleryList.map((src: string) => (
                  <div key={src} className="relative shrink-0 w-36 h-36 rounded-xl overflow-hidden border border-gray-200/20">
                    <Image src={src} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </section>
          )}

          {collaborators.length > 0 && (
            <section className="mb-10">
              <h2 className={cn("text-sm font-bold uppercase tracking-wider mb-4", subCls)}>Equipe Disponível</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                {collaborators.map((c) => {
                  const col = c.color ?? "#3B82F6";
                  return (
                    <div key={c.id} className={cn("flex-shrink-0 flex items-center gap-3 p-3 rounded-xl border min-w-[160px]", cardCls)}>
                      <div
                        className="size-10 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: `${col}35`, color: col }}
                      >
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-semibold truncate", titleCls)}>{c.name}</p>
                        <p className={cn("text-[11px] truncate", mutedCls)}>{c.role ?? "Profissional"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-10">
            <h2 className={cn("text-sm font-bold uppercase tracking-wider mb-4", subCls)}>Serviços</h2>
            {services.length === 0 ? (
              <p className={cn("text-sm", mutedCls)}>Nenhum serviço disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    disabled={bookingBlocked}
                    onClick={() => startBooking(service)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      cardCls,
                      bookingBlocked ? "opacity-60 cursor-not-allowed" : `${cardHover} hover:-translate-y-0.5`
                    )}
                  >
                    <div
                      className={cn(
                        "size-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
                        isDark ? "bg-[#213428]" : "bg-gray-100"
                      )}
                    >
                      {service.emoji ? (
                        <span className="leading-none">{service.emoji}</span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-500 text-[26px]">category</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold truncate", titleCls)}>{service.name}</p>
                      <p className={cn("text-xs mt-0.5", subCls)}>
                        {service.duration_minutes} min · {formatCurrency(service.price_cents / 100)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-500 text-lg shrink-0">calendar_add_on</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>

        {showWhatsappFab && phoneDigits && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-4 z-40 size-14 rounded-full bg-[#25D366] hover:bg-[#20b558] shadow-xl flex items-center justify-center transition-transform hover:scale-105"
          >
            <span className="material-symbols-outlined text-white text-2xl">chat</span>
          </a>
        )}

        <PublicPwaInstallPrompt slug={slug} businessName={business.name} accentColor={accent} isDark={isDark} />
      </div>
    );
  }

  /* ——— visão agendamento (fluxo em etapas) ——— */
  return (
    <div
      className={bookUi.page}
      style={
        {
          ["--public-accent"]: accent,
          ["--pa-slot-glow"]: rgbaFromHex(accent, 0.3),
        } as CSSProperties
      }
    >
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[color-mix(in_srgb,var(--public-accent)_8%,transparent)] blur-[100px] rounded-full pointer-events-none z-0" />

      <header className={cn("relative z-10 border-b backdrop-blur-md", bookUi.header)}>
        <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            className={cn(
              "flex items-center gap-1.5 text-sm shrink-0",
              isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="hidden sm:inline">Página do negócio</span>
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div
              className={cn(
                "size-11 rounded-xl border shrink-0 overflow-hidden flex items-center justify-center text-lg font-bold",
                business.logo_url
                  ? "border-[color-mix(in_srgb,var(--public-accent)_40%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--public-accent)_20%,transparent)] border-[color-mix(in_srgb,var(--public-accent)_40%,transparent)] text-[var(--public-accent)]"
              )}
            >
              {business.logo_url ? (
                <Image src={business.logo_url} alt="" width={44} height={44} className="size-11 object-cover" unoptimized />
              ) : (
                business.name[0]
              )}
            </div>
            <div className="min-w-0">
              <h1 className={cn("text-base font-bold truncate", bookUi.title)}>{business.name}</h1>
              <p className={cn("text-[11px]", bookUi.muted)}>Novo agendamento</p>
            </div>
          </div>
          {!authUserId && (
            <Link
              href={`/entrar?slug=${encodeURIComponent(slug)}`}
              className={cn(
                "text-xs px-2 py-2 rounded-lg shrink-0",
                isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              Entrar
            </Link>
          )}
        </div>
      </header>

      <div className={cn("sticky top-[57px] z-20 backdrop-blur-md border-b", bookUi.sticky)}>
        <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4, 5] as Step[]).map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s
                      ? "bg-[var(--public-accent)] text-black"
                      : step === s
                        ? "bg-[color-mix(in_srgb,var(--public-accent)_20%,transparent)] border-2 border-[var(--public-accent)] text-[var(--public-accent)]"
                        : bookUi.stepIdle
                  }`}
                >
                  {step > s ? <span className="material-symbols-outlined text-sm">check</span> : s}
                </div>
                {s < 5 && (
                  <div className={`flex-1 h-px mx-1 ${step > s ? "bg-[var(--public-accent)]" : bookUi.stepLine}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {["Serviço", "Profissional", "Data", "Horário", "Confirmar"].map((label, i) => (
              <span
                key={label}
                className={`text-xs flex-1 text-center ${
                  step === i + 1 ? "text-[var(--public-accent)] font-semibold" : isDark ? "text-gray-500" : "text-gray-600"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-32">
        {step === 1 && (
          <div>
            <h2 className={cn("text-xl sm:text-2xl font-bold mb-1", bookUi.title)}>Escolha o serviço</h2>
            <p className={cn("text-sm mb-5", bookUi.subtitle)}>Selecione o serviço que deseja agendar</p>
            <div className="relative mb-6 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar serviço..."
                className={cn(
                  "w-full h-11 border rounded-xl pl-9 pr-4 text-sm outline-none focus:border-[var(--public-accent)] transition-colors",
                  bookUi.input
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5",
                    selectedService?.id === service.id
                      ? "border-[var(--public-accent)] bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)]"
                      : cn(bookUi.card, bookUi.cardHover)
                  )}
                >
                  <div
                    className={cn(
                      "size-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0",
                      isDark ? "bg-[#213428]" : "bg-gray-100"
                    )}
                  >
                    {service.emoji ? (
                      <span className="leading-none">{service.emoji}</span>
                    ) : (
                      <span className="material-symbols-outlined text-gray-500 text-[26px]">category</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate", bookUi.title)}>{service.name}</p>
                    <p className={cn("text-xs mt-0.5", bookUi.subtitle)}>
                      {service.duration_minutes}min · {formatCurrency(service.price_cents / 100)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className={cn("text-xl sm:text-2xl font-bold mb-1", bookUi.title)}>Escolha o profissional</h2>
            <p className={cn("text-sm mb-5", bookUi.subtitle)}>
              {(selectedService?.collaborator_services?.length ?? 0) > 0
                ? "Só aparecem quem realiza este serviço."
                : "Qualquer profissional da equipe pode atender este serviço."}
            </p>
            {collabForService.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Nenhum profissional disponível para este serviço no momento. Entre em contato com o estabelecimento.
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedCollab("any");
                  setStep(3);
                }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border hover:border-[color-mix(in_srgb,var(--public-accent)_40%,transparent)] text-left transition-all",
                  bookUi.card
                )}
              >
                <div
                  className={cn(
                    "size-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    isDark ? "bg-[#213428]" : "bg-gray-100"
                  )}
                >
                  <span className="material-symbols-outlined text-[var(--public-accent)] text-2xl">shuffle</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold", bookUi.title)}>Tanto faz / Primeiro disponível</p>
                  <p className={cn("text-xs mt-0.5", bookUi.subtitle)}>Entre os que fazem este serviço</p>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-base flex-shrink-0">chevron_right</span>
              </button>
              {collabForService.map((collab) => {
                const color = collab.color ?? "#3B82F6";
                return (
                  <button
                    key={collab.id}
                    type="button"
                    onClick={() => {
                      setSelectedCollab(collab);
                      setStep(3);
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border hover:border-[color-mix(in_srgb,var(--public-accent)_40%,transparent)] text-left transition-all",
                      bookUi.card
                    )}
                  >
                    <div
                      className="size-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: `${color}30`, border: `2px solid ${color}40` }}
                    >
                      <span style={{ color }}>{collab.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold", bookUi.title)}>{collab.name}</p>
                      <p className={cn("text-xs mt-0.5", bookUi.subtitle)}>{collab.role ?? "—"}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-500 text-base flex-shrink-0">chevron_right</span>
                  </button>
                );
              })}
            </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-lg mx-auto lg:max-w-none">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-10 lg:items-start">
              <div className="lg:col-span-7 xl:col-span-8 min-w-0">
                <h2 className={cn("text-xl sm:text-2xl font-bold mb-1", bookUi.title)}>Escolha a data</h2>
                <p className={cn("text-sm mb-5 lg:mb-6", bookUi.subtitle)}>Selecione o dia do seu atendimento</p>
                <div
                  className={cn(
                    "rounded-2xl border p-5 sm:p-6 lg:p-8 lg:min-h-[min(28rem,calc(100vh-16rem))] flex flex-col",
                    bookUi.card
                  )}
                >
                  <div className="flex items-center justify-between mb-4 lg:mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear(calYear - 1);
                        } else setCalMonth(calMonth - 1);
                      }}
                      className={cn(
                        "size-9 lg:size-10 rounded-xl flex items-center justify-center transition-colors",
                        isDark
                          ? "bg-[#213428] hover:bg-white/10 text-gray-400 hover:text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                    <h3 className={cn("font-bold text-base lg:text-lg", bookUi.title)}>
                      {MONTHS[calMonth]} {calYear}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear(calYear + 1);
                        } else setCalMonth(calMonth + 1);
                      }}
                      className={cn(
                        "size-9 lg:size-10 rounded-xl flex items-center justify-center transition-colors",
                        isDark
                          ? "bg-[#213428] hover:bg-white/10 text-gray-400 hover:text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-2 lg:mb-3">
                    {WEEKDAYS.map((d) => (
                      <div
                        key={d}
                        className="text-center text-[11px] lg:text-xs text-gray-500 font-semibold py-1 lg:tracking-wide"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 lg:gap-2 flex-1 content-start">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const cellDate = new Date(calYear, calMonth, day);
                  cellDate.setHours(0, 0, 0, 0);
                  const today0 = new Date(today);
                  today0.setHours(0, 0, 0, 0);
                  const isPast = cellDate.getTime() < today0.getTime();
                  const isTooFar = cellDate.getTime() > limitDate.getTime();
                  const isClosedBySchedule =
                    bookingMeta != null &&
                    !isDateOpenForPublicBooking(
                      dateStr,
                      bookingMeta.weeklyAvailability,
                      bookingMeta.availabilityOverrides
                    );
                  const isDisabled = isPast || isTooFar || isClosedBySchedule;
                  const disableKind: "past" | "tooFar" | "closed" | null = isDisabled
                    ? isPast
                      ? "past"
                      : isTooFar
                        ? "tooFar"
                        : "closed"
                    : null;
                  const maxDays = bookingMeta?.maxFutureDays ?? maxFutureDays;
                  const dayTitle =
                    disableKind === "past"
                      ? "Dia já passou — não é possível agendar"
                      : disableKind === "tooFar"
                        ? `Fora do período permitido (máx. ${maxDays} dias à frente)`
                        : disableKind === "closed"
                          ? "Sem atendimento neste dia (fechado ou folga no calendário do negócio)"
                          : `Dia ${day} — toque para agendar`;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDisabled}
                      title={dayTitle}
                      aria-label={dayTitle}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime(null);
                        setStep(4);
                      }}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${rgbaFromHex(accent, 0.35)}` } : undefined}
                      className={cn(
                        "aspect-square min-h-[2.5rem] sm:min-h-[2.75rem] lg:aspect-auto lg:min-h-[3.25rem] xl:min-h-[3.5rem] flex items-center justify-center rounded-xl text-sm lg:text-base font-semibold transition-all relative",
                        isSelected
                          ? "bg-[var(--public-accent)] text-black"
                          : isDisabled
                            ? disableKind === "past"
                              ? isDark
                                ? "text-white/25 cursor-not-allowed line-through decoration-white/20"
                                : "text-gray-400 cursor-not-allowed line-through decoration-gray-300"
                              : disableKind === "tooFar"
                                ? isDark
                                  ? "text-white/35 cursor-not-allowed ring-1 ring-inset ring-dashed ring-white/25"
                                  : "text-gray-500 cursor-not-allowed ring-1 ring-inset ring-dashed ring-gray-300"
                                : isDark
                                  ? "text-white/40 cursor-not-allowed bg-white/[0.07]"
                                  : "text-gray-500 cursor-not-allowed bg-gray-100"
                            : isDark
                              ? "text-white hover:bg-[color-mix(in_srgb,var(--public-accent)_20%,transparent)] hover:text-[var(--public-accent)]"
                              : "text-gray-900 hover:bg-[color-mix(in_srgb,var(--public-accent)_15%,transparent)] hover:text-[var(--public-accent)]"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
                  <div
                    className={cn(
                      "mt-auto pt-4 lg:pt-5 border-t flex flex-wrap gap-x-5 gap-y-2.5 text-[11px] lg:text-xs leading-tight",
                      isDark ? "border-white/10 text-white/55" : "border-gray-100 text-gray-600"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "size-6 lg:size-7 shrink-0 rounded-lg text-[10px] font-semibold flex items-center justify-center line-through",
                          isDark ? "text-white/25 bg-transparent ring-1 ring-white/15" : "text-gray-400 ring-1 ring-gray-200"
                        )}
                      >
                        9
                      </span>
                      Passou
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "size-6 lg:size-7 shrink-0 rounded-lg text-[10px] font-semibold flex items-center justify-center ring-1 ring-inset ring-dashed",
                          isDark ? "text-white/35 ring-white/25" : "text-gray-500 ring-gray-300"
                        )}
                      >
                        9
                      </span>
                      Limite de dias
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "size-6 lg:size-7 shrink-0 rounded-lg text-[10px] font-semibold flex items-center justify-center",
                          isDark ? "text-white/40 bg-white/[0.07]" : "text-gray-500 bg-gray-100"
                        )}
                      >
                        9
                      </span>
                      Fechado / folga
                    </span>
                  </div>
                </div>
                <p
                  className={cn(
                    "text-xs mt-3 lg:mt-4 text-center lg:text-left",
                    isDark ? "text-white/45" : "text-gray-500"
                  )}
                >
                  Toque num dia disponível. Passe o dedo (ou o mouse) sobre um dia bloqueado para ver o motivo.
                  {bookingMeta?.minAdvanceHours != null
                    ? ` Antecedência mínima: ${bookingMeta.minAdvanceHours}h.`
                    : ""}
                  {bookingMeta?.maxFutureDays != null
                    ? ` Até ${bookingMeta.maxFutureDays} dias à frente.`
                    : ""}
                </p>
              </div>

              {selectedService && (
                <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 min-w-0">
                  <div
                    className={cn(
                      "sticky top-28 rounded-2xl border overflow-hidden",
                      bookUi.card,
                      isDark
                        ? "border-[color-mix(in_srgb,var(--public-accent)_25%,transparent)] shadow-[0_0_40px_-12px_var(--pa-glow-soft)]"
                        : "border-gray-200/80 shadow-sm"
                    )}
                    style={
                      isDark
                        ? ({ ["--pa-glow-soft"]: rgbaFromHex(accent, 0.25) } as CSSProperties)
                        : undefined
                    }
                  >
                    <div
                      className="h-1 w-full bg-[var(--public-accent)]"
                      style={{ boxShadow: `0 0 20px ${rgbaFromHex(accent, 0.5)}` }}
                    />
                    <div className="p-6 xl:p-7">
                      <p className={cn("text-[11px] font-bold uppercase tracking-widest mb-5", bookUi.muted)}>
                        Seu agendamento
                      </p>
                      <div className="flex gap-4 mb-6">
                        <div
                          className={cn(
                            "size-16 xl:size-[4.5rem] rounded-2xl flex items-center justify-center text-3xl shrink-0",
                            isDark ? "bg-[#213428]" : "bg-gray-100"
                          )}
                        >
                          {selectedService.emoji ? (
                            <span className="leading-none">{selectedService.emoji}</span>
                          ) : (
                            <span className="material-symbols-outlined text-gray-500 text-3xl">category</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-bold text-lg xl:text-xl leading-snug", bookUi.title)}>
                            {selectedService.name}
                          </p>
                          <p className={cn("text-sm mt-2", bookUi.subtitle)}>
                            {selectedService.duration_minutes} min · {formatCurrency(selectedService.price_cents / 100)}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "rounded-xl p-4 border",
                          isDark ? "border-white/10 bg-white/[0.04]" : "border-gray-100 bg-gray-50/90"
                        )}
                      >
                        <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", bookUi.muted)}>
                          Profissional
                        </p>
                        <p className={cn("text-sm font-semibold", bookUi.title)}>
                          {selectedCollab === "any"
                            ? "Primeiro disponível na equipe"
                            : selectedCollab
                              ? selectedCollab.name
                              : "—"}
                        </p>
                      </div>
                      <p className={cn("text-xs leading-relaxed mt-6", bookUi.muted)}>
                        No calendário ao lado, os dias em destaque estão livres para agendar. Passe o cursor sobre um
                        dia indisponível para ver se já passou, está fora do período ou o estabelecimento não abre.
                      </p>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="w-full max-w-2xl lg:max-w-4xl mx-auto">
            <h2 className={cn("text-xl sm:text-2xl font-bold mb-1", bookUi.title)}>Escolha o horário</h2>
            <p className={cn("text-sm mb-6", bookUi.subtitle)}>
              {selectedDate &&
                new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
            </p>
            {slotsLoading && (
              <div className={cn("flex items-center gap-3 text-sm py-8", bookUi.subtitle)}>
                <div className="size-6 border-2 border-[color-mix(in_srgb,var(--public-accent)_30%,transparent)] border-t-[var(--public-accent)] rounded-full animate-spin" />
                Carregando horários livres…
              </div>
            )}
            {!slotsLoading && slotsError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {slotsError}
              </div>
            )}
            {!slotsLoading && !slotsError && dayTimeline && (
              <div className="space-y-4">
                <p className={cn("text-xs leading-relaxed", bookUi.muted)}>
                  A linha do tempo mostra o expediente, pausas e horários já ocupados neste profissional. Arraste o
                  bloco &quot;Você&quot; para escolher o horário de início do seu atendimento (o horário em destaque é o
                  seu).
                  {dayTimeline.bufferMinutes > 0 ? (
                    <>
                      {" "}
                      A faixa listrada após o bloco verde é o intervalo fixo entre um atendimento e outro.
                    </>
                  ) : null}
                </p>
                <p className={cn("text-sm font-semibold", bookUi.title)}>
                  {dayTimeline.viewCollaboratorName}
                </p>
                <PublicBookingDayTimeline
                  isDark={isDark}
                  accentColor={accent}
                  payload={dayTimeline}
                  startMin={sliderStartMin}
                  onStartMinChange={setSliderStartMin}
                />
                <p className={cn("text-sm", bookUi.subtitle)}>
                  Início do seu atendimento:{" "}
                  <span className={cn("font-bold tabular-nums", bookUi.title)}>{minutesToTime(sliderStartMin)}</span>
                  {!sliderPositionValid && (
                    <span
                      className={cn(
                        "block text-xs mt-1",
                        isDark ? "text-amber-200/90" : "text-amber-800"
                      )}
                    >
                      Este encaixe não é válido (sobrepõe pausa, bloqueio ou horário indisponível). Arraste para outro
                      horário.
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  disabled={!sliderPositionValid}
                  onClick={() => {
                    if (!sliderPositionValid) return;
                    setSelectedTime(minutesToTime(sliderStartMin));
                    setStep(5);
                  }}
                  style={{ boxShadow: `0 0 16px ${rgbaFromHex(accent, 0.25)}` }}
                  className="w-full py-3.5 bg-[var(--public-accent)] hover:brightness-95 disabled:opacity-45 disabled:cursor-not-allowed text-black font-bold rounded-xl text-base transition-all"
                >
                  Continuar
                </button>
              </div>
            )}
            {!slotsLoading && !slotsError && !dayTimeline && slotTimeline.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Nenhum horário disponível neste dia para a combinação escolhida. Tente outra data ou outro
                profissional.
              </div>
            )}
            {!slotsLoading && !slotsError && !dayTimeline && slotTimeline.length > 0 && (
              <div className="space-y-4">
                {bookingMeta?.publicBookingTimeUi === "blocks" ? (
                  <p className={cn("text-sm leading-relaxed", bookUi.muted)}>
                    Escolha um horário tocando em um dos blocos abaixo. Horários esmaecidos estão indisponíveis (já
                    ocupados, pausa no expediente ou intervalo após outro atendimento).
                  </p>
                ) : (
                  <p className={cn("text-xs leading-relaxed", bookUi.muted)}>
                    Horários esmaecidos estão indisponíveis (já ocupados, pausa no expediente ou intervalo após outro
                    atendimento).
                  </p>
                )}
                {selectedCollab && selectedCollab !== "any" ? (
                  <p className={cn("text-sm font-semibold", bookUi.title)}>{selectedCollab.name}</p>
                ) : selectedCollab === "any" ? (
                  <p className={cn("text-sm font-semibold", bookUi.title)}>Primeiro disponível na equipe</p>
                ) : null}
                {slotGroups.map(({ label, icon, cells }) => (
                  <div key={label} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn("material-symbols-outlined text-base", bookUi.muted)}>{icon}</span>
                      <h3 className={cn("text-sm font-semibold", bookUi.muted)}>{label}</h3>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                      {cells.map((cell) => (
                        <button
                          key={cell.start}
                          type="button"
                          disabled={!cell.available}
                          title={!cell.available ? publicSlotReasonLabel(cell.reason) : undefined}
                          aria-label={
                            cell.available
                              ? `Agendar às ${cell.start}`
                              : `${cell.start} indisponível: ${publicSlotReasonLabel(cell.reason)}`
                          }
                          onClick={() => {
                            if (!cell.available) return;
                            setSelectedTime(cell.start);
                            setStep(5);
                          }}
                          className={cn(
                            "py-3 lg:py-3.5 rounded-xl text-sm lg:text-base font-bold transition-all border",
                            !cell.available &&
                              cn(
                                "opacity-50 cursor-not-allowed border-dashed",
                                isDark ? "border-white/25 text-gray-500" : "border-gray-300 text-gray-500"
                              ),
                            cell.available &&
                              selectedTime === cell.start &&
                              "bg-[var(--public-accent)] text-black border-[var(--public-accent)] shadow-[0_0_10px_var(--pa-slot-glow)]",
                            cell.available &&
                              selectedTime !== cell.start &&
                              cn(
                                bookUi.card,
                                isDark
                                  ? "text-white hover:border-[color-mix(in_srgb,var(--public-accent)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)] hover:text-[var(--public-accent)]"
                                  : "text-gray-900 hover:border-[color-mix(in_srgb,var(--public-accent)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)] hover:text-[var(--public-accent)]"
                              )
                          )}
                        >
                          {cell.start}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="max-w-2xl lg:max-w-3xl">
            <h2 className={cn("text-xl sm:text-2xl font-bold mb-1", bookUi.title)}>Confirmar agendamento</h2>
            <p className={cn("text-sm mb-6", bookUi.subtitle)}>Revise os detalhes antes de confirmar</p>

            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
              <div
                className={cn(
                  "border border-[color-mix(in_srgb,var(--public-accent)_30%,transparent)] rounded-2xl p-5 sm:p-6 mb-5",
                  bookUi.card
                )}
              >
                <div className="space-y-3">
                  {[
                    { icon: "content_cut", label: "Serviço", value: selectedService?.name ?? "" },
                    {
                      icon: "person",
                      label: "Profissional",
                      value:
                        selectedCollab === "any"
                          ? "Definido automaticamente (primeiro disponível no horário)"
                          : (selectedCollab as CollabRow)?.name ?? "",
                    },
                    {
                      icon: "calendar_today",
                      label: "Data",
                      value: selectedDate
                        ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })
                        : "",
                    },
                    { icon: "schedule", label: "Horário", value: selectedTime ?? "" },
                    { icon: "timer", label: "Duração", value: `${selectedService?.duration_minutes ?? 0}min` },
                    {
                      icon: "payments",
                      label: "Valor",
                      value: formatCurrency((selectedService?.price_cents ?? 0) / 100),
                      highlight: true,
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className={cn("material-symbols-outlined text-base w-5", bookUi.muted)}>{item.icon}</span>
                      <span className={cn("text-sm w-24 flex-shrink-0", bookUi.muted)}>{item.label}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          item.highlight ? "text-[var(--public-accent)]" : bookUi.title
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-5">
                  <label className={cn("text-sm font-medium block mb-2", bookUi.label)}>
                    Seu nome <span className={bookUi.muted}>(obrigatório)</span>
                  </label>
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
                </div>

                <div className="mb-5">
                  <label className={cn("text-sm font-medium block mb-2", bookUi.label)}>
                    Observações <span className={bookUi.muted}>(opcional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Prefiro deixar um pouco mais comprido nas laterais..."
                    rows={3}
                    className={cn(
                      "w-full border focus:border-[var(--public-accent)] rounded-xl px-4 py-3 outline-none transition-colors text-sm resize-none",
                      bookUi.input
                    )}
                  />
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5">
                  <span className="material-symbols-outlined text-amber-500 text-base flex-shrink-0 mt-0.5">info</span>
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      isDark ? "text-amber-200" : "text-amber-900"
                    )}
                  >
                    Você pode agendar sem criar conta — basta informar seu nome. Com conta de cliente você acompanha
                    histórico e cancelamentos em{" "}
                    <Link href="/conta" className="font-semibold text-[var(--public-accent)] hover:underline">
                      Minha conta
                    </Link>{" "}
                    após o vínculo com o negócio.
                  </p>
                </div>

                {!authUserId && (
                  <div className="flex gap-2 mb-3">
                    <Link
                      href={`/entrar?slug=${encodeURIComponent(slug)}`}
                      className={cn(
                        "flex-1 py-3 font-semibold rounded-xl text-sm transition-all text-center",
                        isDark
                          ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                          : "bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-900"
                      )}
                    >
                      Entrar / Criar conta
                    </Link>
                  </div>
                )}

                {bookError && (
                  <div
                    className={cn(
                      "mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-sm",
                      isDark ? "text-red-300" : "text-red-700"
                    )}
                  >
                    {bookError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleBook()}
                  disabled={!clientName.trim() || bookingSubmitting}
                  style={{ boxShadow: `0 0 20px ${rgbaFromHex(accent, 0.3)}` }}
                  className="w-full py-4 bg-[var(--public-accent)] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  {bookingSubmitting ? "Confirmando…" : "Confirmar agendamento"}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  {bookingMeta?.minAdvanceHours != null
                    ? `Cancelamento com pelo menos ${bookingMeta.minAdvanceHours}h de antecedência (quando permitido pelo negócio).`
                    : "Cancelamento com antecedência mínima configurada pelo negócio."}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {step > 1 && (
        <div className={cn("fixed bottom-0 left-0 right-0 z-30 p-4 backdrop-blur-md border-t", bookUi.bottomBar)}>
          <div className="max-w-4xl lg:max-w-5xl mx-auto flex gap-3">
            <button
              type="button"
              onClick={() => setStep((step - 1) as Step)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 border font-semibold rounded-xl text-sm transition-all",
                isDark
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-900"
              )}
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Voltar
            </button>
            <div className={cn("flex-1 flex items-center gap-2 rounded-xl px-4 text-sm overflow-hidden border", bookUi.chip)}>
              {selectedService && (
                <span className={cn("truncate", bookUi.muted)}>
                  {selectedService.emoji ? `${selectedService.emoji} ` : ""}
                  {selectedService.name}
                  {selectedTime && ` · ${selectedTime}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {showWhatsappFab && phoneDigits && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-4 z-40 size-12 rounded-full bg-[#25D366] hover:bg-[#20b558] shadow-lg flex items-center justify-center transition-all hover:scale-110"
        >
          <span className="material-symbols-outlined text-white text-xl">chat</span>
        </a>
      )}

      <PublicPwaInstallPrompt slug={slug} businessName={business.name} accentColor={accent} isDark={isDark} />
    </div>
  );
}

export default function PublicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <PublicPageInner />
    </Suspense>
  );
}

function SuccessScreen({
  service,
  collab,
  date,
  time,
  slug,
  businessName,
  collaboratorName,
  accentColor,
}: {
  service: ServiceRow | null;
  collab: CollabRow | "any" | null;
  date: string | null;
  time: string | null;
  slug: string;
  businessName: string;
  collaboratorName: string | null;
  accentColor: string;
}) {
  return (
    <div
      className="min-h-screen bg-[#020403] flex flex-col items-center justify-center px-4 py-8 sm:py-12"
      style={{ ["--public-accent"]: accentColor } as CSSProperties}
    >
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[color-mix(in_srgb,var(--public-accent)_15%,transparent)] blur-[100px] rounded-full pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm sm:max-w-md lg:max-w-lg flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-8">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
          <div className="size-20 sm:size-24 rounded-3xl bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)] border-2 border-[color-mix(in_srgb,var(--public-accent)_30%,transparent)] flex items-center justify-center mb-4 sm:mb-6">
            <span className="material-symbols-outlined text-[var(--public-accent)] text-4xl sm:text-5xl filled">
              check_circle
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Agendamento confirmado!</h1>
          <p className="text-gray-400 text-sm mb-6 sm:mb-0">Você receberá uma confirmação por e-mail em breve.</p>
        </div>
        <div className="flex flex-col gap-4 flex-1 max-w-sm mx-auto sm:mx-0 w-full">
          <div className="bg-[#14221A] border border-[#213428] rounded-2xl p-5 sm:p-6">
            <div className="space-y-3">
              {[
                { label: "Serviço", value: service?.name ?? "" },
                {
                  label: "Profissional",
                  value:
                    collaboratorName ??
                    (collab === "any" ? "Equipe (definido no agendamento)" : (collab as CollabRow)?.name ?? ""),
                },
                {
                  label: "Data",
                  value: date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR") : "",
                },
                { label: "Horário", value: time ?? "" },
                { label: "Valor", value: formatCurrency((service?.price_cents ?? 0) / 100), highlight: true },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span
                    className={`text-sm font-bold ${item.highlight ? "text-[var(--public-accent)]" : "text-white"}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">calendar_add_on</span>
              Adicionar ao Google Calendar
            </button>
            <Link
              href="/conta"
              className="block w-full py-3 bg-[var(--public-accent)] hover:brightness-95 text-black font-bold rounded-xl text-sm transition-all text-center"
            >
              Minha conta e agendamentos
            </Link>
            <Link
              href={`/${slug}`}
              className="block w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-all text-center"
            >
              Voltar à página do negócio
            </Link>
            <p className="text-xs text-gray-500 text-center">
              Com sua conta você gerencia e cancela em{" "}
              <Link href="/conta" className="text-[var(--public-accent)] font-semibold hover:underline">
                Minha conta
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <PublicPwaInstallPrompt slug={slug} businessName={businessName} accentColor={accentColor} isDark={true} />
    </div>
  );
}
