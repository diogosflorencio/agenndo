"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5;

type BusinessRow = { id: string; name: string; slug: string; city: string | null; phone: string | null; primary_color: string | null };
type ServiceRow = { id: string; name: string; duration_minutes: number; price_cents: number; emoji: string | null; collaborator_services: { collaborator_id: string }[] };
type CollabRow = { id: string; name: string; role: string | null; color: string | null };

const AVAILABLE_TIMES = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "14:00", "14:30", "15:00", "15:30", "16:00", "17:00",
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function PublicPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<CollabRow | "any" | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState(false);
  const [clientName, setClientName] = useState("");

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
        const { data: biz } = await supabase.from("businesses").select("id, name, slug, city, phone, primary_color").eq("slug", slug).single();
        if (!biz) {
          setLoading(false);
          return;
        }
        setBusiness(biz as BusinessRow);
        const bid = (biz as BusinessRow).id;
        const [sRes, cRes] = await Promise.all([
          supabase.from("services").select("id, name, duration_minutes, price_cents, emoji, collaborator_services(collaborator_id)").eq("business_id", bid).eq("active", true),
          supabase.from("collaborators").select("id, name, role, color").eq("business_id", bid).eq("active", true),
        ]);
        setServices((sRes.data as ServiceRow[]) ?? []);
        setCollaborators((cRes.data as CollabRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDay(calYear, calMonth);

  const morningTimes = AVAILABLE_TIMES.filter((t) => Number(t.split(":")[0]) < 12);
  const afternoonTimes = AVAILABLE_TIMES.filter((t) => Number(t.split(":")[0]) >= 12 && Number(t.split(":")[0]) < 17);
  const eveningTimes = AVAILABLE_TIMES.filter((t) => Number(t.split(":")[0]) >= 17);

  const handleBook = () => setBooked(true);

  const collabForService = selectedService
    ? collaborators.filter((c) => (selectedService.collaborator_services ?? []).some((cs) => cs.collaborator_id === c.id))
    : collaborators;

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
        <Link href="/" className="text-primary font-semibold hover:underline">Voltar ao início</Link>
      </div>
    );
  }

  if (booked) {
    return <SuccessScreen service={selectedService} collab={selectedCollab} date={selectedDate} time={selectedTime} slug={slug} businessName={business.name} />;
  }

  return (
    <div className="min-h-screen bg-[#020403]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/8 blur-[100px] rounded-full pointer-events-none z-0" />

      <header className="relative z-10 border-b border-white/5 bg-[#080c0a]/90 backdrop-blur-md">
        <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="size-14 sm:size-16 rounded-xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
              {business.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{business.name}</h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {business.city && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {business.city}
                </div>
                )}
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <span className="material-symbols-outlined text-xs filled">star</span>
                  4.9 (127 avaliações)
                </div>
              </div>
            </div>
            <Link
              href={`/entrar?slug=${encodeURIComponent(slug)}`}
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-base">person</span>
              Entrar
            </Link>
            <a
              href={business.phone ? `https://wa.me/55${business.phone.replace(/\D/g, "")}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="size-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center flex-shrink-0 hover:bg-[#25D366]/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[#25D366] text-base">chat</span>
            </a>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 bg-[#020403]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4, 5] as Step[]).map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s ? "bg-primary text-black" :
                    step === s ? "bg-primary/20 border-2 border-primary text-primary" :
                    "bg-white/5 text-gray-500"
                  }`}
                >
                  {step > s ? <span className="material-symbols-outlined text-sm">check</span> : s}
                </div>
                {s < 5 && (
                  <div className={`flex-1 h-px mx-1 ${step > s ? "bg-primary" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {["Serviço", "Profissional", "Data", "Horário", "Confirmar"].map((label, i) => (
              <span key={label} className={`text-xs flex-1 text-center ${step === i + 1 ? "text-primary font-semibold" : "text-gray-600"}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-32">
        {step === 1 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Escolha o serviço</h2>
            <p className="text-gray-400 text-sm mb-5">Selecione o serviço que deseja agendar</p>
            <div className="relative mb-6 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">search</span>
              <input
                type="text"
                placeholder="Buscar serviço..."
                className="w-full h-11 bg-[#14221A] border border-[#213428] rounded-xl pl-9 pr-4 text-sm text-white placeholder-gray-600 outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => { setSelectedService(service); setStep(2); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 ${
                    selectedService?.id === service.id
                      ? "border-primary bg-primary/10"
                      : "border-[#213428] bg-[#14221A] hover:border-white/20"
                  }`}
                >
                  <div className="size-12 rounded-xl bg-[#213428] flex items-center justify-center text-2xl flex-shrink-0">
                    {service.emoji ?? "✂️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{service.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{service.duration_minutes}min · {formatCurrency(service.price_cents / 100)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Escolha o profissional</h2>
            <p className="text-gray-400 text-sm mb-5">Com quem você prefere ser atendido?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => { setSelectedCollab("any"); setStep(3); }}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#213428] bg-[#14221A] hover:border-primary/40 text-left transition-all"
              >
                <div className="size-12 rounded-xl bg-[#213428] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-2xl">shuffle</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold">Tanto faz / Primeiro disponível</p>
                  <p className="text-gray-400 text-xs mt-0.5">O profissional mais próximo disponível</p>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-base flex-shrink-0">chevron_right</span>
              </button>
              {collabForService.map((collab) => {
                const color = collab.color ?? "#3B82F6";
                return (
                  <button
                    key={collab.id}
                    type="button"
                    onClick={() => { setSelectedCollab(collab); setStep(3); }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[#213428] bg-[#14221A] hover:border-primary/40 text-left transition-all"
                  >
                    <div className="size-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: `${color}30`, border: `2px solid ${color}40` }}>
                      <span style={{ color }}>{collab.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{collab.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{collab.role ?? "—"}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-500 text-base flex-shrink-0">chevron_right</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Escolha a data</h2>
            <p className="text-gray-400 text-sm mb-5">Selecione o dia do seu atendimento</p>
            <div className="bg-[#14221A] border border-[#213428] rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                    else setCalMonth(calMonth - 1);
                  }}
                  className="size-9 rounded-xl bg-[#213428] hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <h3 className="text-white font-bold">{MONTHS[calMonth]} {calYear}</h3>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                    else setCalMonth(calMonth + 1);
                  }}
                  className="size-9 rounded-xl bg-[#213428] hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isPast = new Date(dateStr) < new Date(today.toDateString());
                  const isSelected = selectedDate === dateStr;
                  const isSunday = new Date(dateStr).getDay() === 0;
                  return (
                    <button
                      key={day}
                      disabled={isPast || isSunday}
                      onClick={() => { setSelectedDate(dateStr); setStep(4); }}
                      className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                        isSelected ? "bg-primary text-black" :
                        isPast || isSunday ? "text-gray-700 cursor-not-allowed" :
                        "text-white hover:bg-primary/20 hover:text-primary"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Domingos indisponíveis · Agendamentos com até 2h de antecedência
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Escolha o horário</h2>
            <p className="text-gray-400 text-sm mb-6">
              {selectedDate && new Date(selectedDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {[
              { label: "Manhã", icon: "wb_sunny", times: morningTimes },
              { label: "Tarde", icon: "wb_twilight", times: afternoonTimes },
              { label: "Noite", icon: "nightlight", times: eveningTimes },
            ].map(({ label, icon, times }) => times.length > 0 && (
              <div key={label} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-gray-400 text-base">{icon}</span>
                  <h3 className="text-sm font-semibold text-gray-400">{label}</h3>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
                  {times.map((time) => (
                    <button
                      key={time}
                      onClick={() => { setSelectedTime(time); setStep(5); }}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        selectedTime === time
                          ? "bg-primary text-black shadow-[0_0_10px_rgba(19,236,91,0.3)]"
                          : "bg-[#14221A] border border-[#213428] text-white hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="max-w-2xl lg:max-w-3xl">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Confirmar agendamento</h2>
            <p className="text-gray-400 text-sm mb-6">Revise os detalhes antes de confirmar</p>

            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
            <div className="bg-[#14221A] border border-primary/30 rounded-2xl p-5 sm:p-6 mb-5">
              <div className="space-y-3">
                {[
                  { icon: "content_cut", label: "Serviço", value: selectedService?.name ?? "" },
                  {
                    icon: "person",
                    label: "Profissional",
                    value: selectedCollab === "any" ? "Primeiro disponível" : (selectedCollab as CollabRow)?.name ?? "",
                  },
                  {
                    icon: "calendar_today",
                    label: "Data",
                    value: selectedDate ? new Date(selectedDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : "",
                  },
                  { icon: "schedule", label: "Horário", value: selectedTime ?? "" },
                  { icon: "timer", label: "Duração", value: `${selectedService?.duration_minutes ?? 0}min` },
                  { icon: "payments", label: "Valor", value: formatCurrency((selectedService?.price_cents ?? 0) / 100), highlight: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400 text-base w-5">{item.icon}</span>
                    <span className="text-gray-400 text-sm w-24 flex-shrink-0">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.highlight ? "text-primary" : "text-white"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Seu nome <span className="text-gray-500">(obrigatório)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Como quer ser chamado(a)"
                className="w-full h-11 bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors text-sm"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Observações <span className="text-gray-500">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Prefiro deixar um pouco mais comprido nas laterais..."
                rows={3}
                className="w-full bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors text-sm resize-none"
              />
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5">
              <span className="material-symbols-outlined text-amber-400 text-base flex-shrink-0 mt-0.5">info</span>
              <p className="text-xs text-amber-200 leading-relaxed">
                Você pode agendar sem criar conta — basta informar seu nome. Porém, <strong>sem conta você não poderá cancelar ou remarcar</strong>. Em &quot;Entrar / Criar conta&quot; você acessa como <strong>cliente</strong>; para gerenciar um negócio use agenndo.com/login.
              </p>
            </div>

            <div className="flex gap-2 mb-3">
              <Link
                href={`/entrar?slug=${encodeURIComponent(slug)}`}
                className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-all text-center"
              >
                Entrar / Criar conta (cliente)
              </Link>
            </div>

            <button
              onClick={handleBook}
              disabled={!clientName.trim()}
              className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(19,236,91,0.3)] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Confirmar agendamento
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Cancelamento gratuito até 2 horas antes (apenas com conta de cliente)
            </p>
            </div>
            </div>
          </div>
        )}
      </main>

      {step > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-[#020403]/95 backdrop-blur-md border-t border-white/5">
          <div className="max-w-4xl lg:max-w-5xl mx-auto flex gap-3">
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-all"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Voltar
            </button>
            <div className="flex-1 flex items-center gap-2 bg-[#14221A] border border-[#213428] rounded-xl px-4 text-sm overflow-hidden">
              {selectedService && (
                <span className="text-gray-400 truncate">
                  {selectedService.emoji ?? "✂️"} {selectedService.name}
                  {selectedTime && ` · ${selectedTime}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <a
        href="https://wa.me/5511999998888"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-4 z-40 size-12 rounded-full bg-[#25D366] hover:bg-[#20b558] shadow-lg flex items-center justify-center transition-all hover:scale-110"
      >
        <span className="material-symbols-outlined text-white text-xl">chat</span>
      </a>
    </div>
  );
}

function SuccessScreen({
  service,
  collab,
  date,
  time,
  slug,
  businessName,
}: {
  service: ServiceRow | null;
  collab: CollabRow | "any" | null;
  date: string | null;
  time: string | null;
  slug: string;
  businessName: string;
}) {
  return (
    <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm sm:max-w-md lg:max-w-lg flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-8">
        {/* Coluna principal: ícone + texto + resumo */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
          <div className="size-20 sm:size-24 rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4 sm:mb-6">
            <span className="material-symbols-outlined text-primary text-4xl sm:text-5xl filled">check_circle</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Agendamento confirmado!</h1>
          <p className="text-gray-400 text-sm mb-6 sm:mb-0">Você receberá uma confirmação por e-mail em breve.</p>
        </div>
        {/* Coluna: card resumo + ações (desktop lado a lado) */}
        <div className="flex flex-col gap-4 flex-1 max-w-sm mx-auto sm:mx-0 w-full">
          <div className="bg-[#14221A] border border-[#213428] rounded-2xl p-5 sm:p-6">
            <div className="space-y-3">
              {[
                { label: "Serviço", value: service?.name ?? "" },
                { label: "Data", value: date ? new Date(date).toLocaleDateString("pt-BR") : "" },
                { label: "Horário", value: time ?? "" },
                { label: "Valor", value: formatCurrency((service?.price_cents ?? 0) / 100), highlight: true },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className={`text-sm font-bold ${item.highlight ? "text-primary" : "text-white"}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <button className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">calendar_add_on</span>
              Adicionar ao Google Calendar
            </button>
            <Link href={`/${slug}`} className="block w-full py-3 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all text-center">
              Voltar à página do negócio
            </Link>
            <p className="text-xs text-gray-500 text-center">Para cancelar ou remarcar, use sua conta ou o link enviado por e-mail.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
