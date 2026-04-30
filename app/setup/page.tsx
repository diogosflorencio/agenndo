"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, ArrowLeft } from "lucide-react";
import { type PlanId, isPaidPlanId } from "@/lib/plans";
import {
  readPricingLock,
  writePricingLock,
  resolveEffectiveDynamicPlan,
  type PricingLockPayload,
} from "@/lib/pricing-lock";
import { formatBrazilPhoneFromDigits, phoneDigitsOnly, slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/** Mesmo número usado em `WhatsAppSupportWidget`; env opcional no deploy. */
const SUPPORT_WHATSAPP =
  typeof process.env.NEXT_PUBLIC_AGENNDO_SUPPORT_WHATSAPP === "string"
    ? process.env.NEXT_PUBLIC_AGENNDO_SUPPORT_WHATSAPP.replace(/\D/g, "")
    : "5513981740870";

const SEGMENTS = [
  "Salão de Beleza", "Clínica de Estética", "Manicure / Pedicure", "Barbearia",
  "Estúdio de Tatuagem", "Personal Trainer", "Fisioterapia", "Psicologia",
  "Nutrição", "Fotografia", "Pet Shop", "Consultório Médico",
  "Odontologia", "Coach", "Professor Particular", "Outro",
];

const COLORS = [
  { value: "#13EC5B", label: "Verde" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#8B5CF6", label: "Violeta" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#F59E0B", label: "Âmbar" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#6366F1", label: "Índigo" },
];

type SetupFormData = {
  businessName: string;
  segment: string;
  phone: string;
  slug: string;
  teamSize: "1" | "2-5" | "6-15" | "16+";
  dailyAppointments: number;
  averageTicket: number;
  primaryColor: string;
  logo: File | null;
};

type ProfilePricingRow = {
  recommended_plan: string | null;
  recommended_price_display: number | null;
  onboarding_inputs: unknown;
};

export default function SetupPage() {
  const router = useRouter();
  const slugUserEditedRef = useRef(false);
  const [step, setStep] = useState(1);
  const [lockSnapshot, setLockSnapshot] = useState<PricingLockPayload | null>(null);
  const [profileRec, setProfileRec] = useState<ProfilePricingRow | null>(null);
  /** null = ainda não checou ou slug curto demais; true = já existe em businesses */
  const [slugTaken, setSlugTaken] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [data, setData] = useState<SetupFormData>({
    businessName: "",
    segment: "",
    phone: "",
    slug: "",
    teamSize: "1" as "1" | "2-5" | "6-15" | "16+",
    dailyAppointments: 8,
    averageTicket: 30,
    primaryColor: "#13EC5B",
    logo: null as File | null,
  });

  const totalSteps = 5;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  useEffect(() => {
    setLockSnapshot(readPricingLock());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("recommended_plan, recommended_price_display, onboarding_inputs")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data) setProfileRec(data as ProfilePricingRow);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profileRec?.onboarding_inputs || typeof profileRec.onboarding_inputs !== "object") return;
    const o = profileRec.onboarding_inputs as Record<string, unknown>;
    setData((prev) => ({
      ...prev,
      ...(typeof o.teamSize === "string" && ["1", "2-5", "6-15", "16+"].includes(o.teamSize)
        ? { teamSize: o.teamSize as SetupFormData["teamSize"] }
        : {}),
      ...(typeof o.dailyAppointments === "number" ? { dailyAppointments: o.dailyAppointments } : {}),
      ...(typeof o.averageTicket === "number" ? { averageTicket: o.averageTicket } : {}),
    }));
  }, [profileRec?.onboarding_inputs]);

  useEffect(() => {
    const raw = data.slug.trim();
    if (!raw || raw.length < 2) {
      setSlugTaken(null);
      setSlugChecking(false);
      return;
    }
    setSlugChecking(true);
    const id = window.setTimeout(async () => {
      const supabase = createClient();
      const { data: row } = await supabase.from("businesses").select("id").eq("slug", raw).maybeSingle();
      setSlugTaken(Boolean(row?.id));
      setSlugChecking(false);
    }, 450);
    return () => window.clearTimeout(id);
  }, [data.slug]);

  const effectivePlan = useMemo(
    () =>
      resolveEffectiveDynamicPlan(
        {
          teamSize: data.teamSize,
          dailyAppointments: data.dailyAppointments,
          averageTicket: data.averageTicket,
        },
        lockSnapshot,
        profileRec
      ),
    [
      data.teamSize,
      data.dailyAppointments,
      data.averageTicket,
      lockSnapshot,
      profileRec?.recommended_plan,
      profileRec?.recommended_price_display,
    ]
  );

  /** Primeira vez no passo do preço: grava lock no navegador se ainda não existir (anti-manipulação; sem UI). */
  useEffect(() => {
    if (step !== 5) return;
    const fromStorage = readPricingLock();
    if (fromStorage && isPaidPlanId(fromStorage.tier)) {
      setLockSnapshot((prev) => {
        if (
          prev?.tier === fromStorage.tier &&
          prev?.priceDisplay === fromStorage.priceDisplay &&
          prev?.lockedAt === fromStorage.lockedAt
        ) {
          return prev;
        }
        return fromStorage;
      });
      return;
    }
    const { tier, monthlyPrice } = effectivePlan;
    if (!isPaidPlanId(tier)) return;
    writePricingLock(tier, monthlyPrice);
    const next = readPricingLock();
    if (next) setLockSnapshot(next);
  }, [step, effectivePlan.tier, effectivePlan.monthlyPrice]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const persistPricingIdentity = async (userId: string) => {
    const supabase = createClient();
    const tierToLock = effectivePlan.tier;
    const priceToLock = effectivePlan.monthlyPrice;
    const onboarding_inputs = {
      teamSize: data.teamSize,
      dailyAppointments: data.dailyAppointments,
      averageTicket: data.averageTicket,
    };
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        recommended_plan: tierToLock,
        recommended_price_display: priceToLock,
        onboarding_inputs,
      })
      .eq("id", userId);
    if (profileErr) console.warn("[setup] perfil de precificação:", profileErr.message);
    writePricingLock(tierToLock, priceToLock);
    setLockSnapshot(readPricingLock());
  };

  const handleFinish = async (planId: PlanId) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/setup");
      return;
    }

    const slug = data.slug || slugify(data.businessName) || "meu-negocio";
    const { data: inserted, error: bizError } = await supabase
      .from("businesses")
      .insert({
        profile_id: user.id,
        name: data.businessName || "Meu Negócio",
        slug,
        segment: data.segment || null,
        phone: phoneDigitsOnly(data.phone) || null,
        primary_color: data.primaryColor || "#13EC5B",
        plan: planId,
      })
      .select("id")
      .single();

    if (bizError || !inserted?.id) {
      console.error(bizError);
      localStorage.setItem("agenndo_setup_complete", "true");
      localStorage.setItem("agenndo_plan", planId);
      localStorage.setItem("agenndo_plan_price", String(effectivePlan.monthlyPrice));
      await persistPricingIdentity(user.id);
      window.location.href = "/dashboard";
      return;
    }

    localStorage.setItem("agenndo_setup_complete", "true");
    localStorage.setItem("agenndo_plan", planId);
    localStorage.setItem("agenndo_plan_price", String(effectivePlan.monthlyPrice));

    await persistPricingIdentity(user.id);

    if (planId !== "free") {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ businessId: inserted.id, planId }),
        });
        const json = (await res.json()) as { url?: string; error?: string };
        if (res.ok && json.url) {
          window.location.href = json.url;
          return;
        }
        console.warn("Checkout Stripe:", json.error ?? res.status);
      } catch (e) {
        console.warn("Checkout Stripe falhou", e);
      }
    }

    window.location.href = "/dashboard";
  };

  const updateData = (field: string, value: unknown) => {
    if (field === "slug") {
      slugUserEditedRef.current = true;
      setData((prev) => ({ ...prev, slug: slugify(String(value)) }));
      return;
    }
    if (field === "businessName") {
      setData((prev) => {
        const name = String(value);
        const next: SetupFormData = { ...prev, businessName: name };
        if (!slugUserEditedRef.current) {
          next.slug = slugify(name);
        }
        return next;
      });
      return;
    }
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const stepLabel =
    step === 1 ? "Negócio" : step === 2 ? "Equipe" : step === 3 ? "Volume" : step === 4 ? "Aparência" : "Começar";

  return (
    <div className="min-h-screen bg-[#102216] text-white flex flex-col lg:flex-row">
      {/* Painel visual: desktop lateral esquerda; mobile oculto */}
      <aside className="hidden lg:flex lg:w-[42%] xl:w-[45%] lg:min-h-screen flex-col relative overflow-hidden bg-gradient-to-br from-[#0d2818] via-[#102216] to-[#0a1f12]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(19,236,91,0.12),transparent)]" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#13ec5b]/10 blur-[80px]" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-emerald-500/10 blur-[60px]" />
        <div className="absolute top-[15%] right-[20%] w-20 h-20 border border-white/10 rounded-2xl rotate-12" />
        <div className="absolute top-[45%] left-[15%] w-3 h-3 rounded-full bg-white/20" />
        <div className="absolute top-[55%] right-[25%] w-2 h-2 rounded-full bg-[#13ec5b]/40" />
        <div className="absolute bottom-[25%] left-[20%] w-24 h-24 border border-white/5 rounded-3xl -rotate-6" />
        <div className="absolute bottom-[35%] right-[15%] w-16 h-16 border border-white/8 rounded-xl rotate-12" />
        <div className="relative z-10 flex flex-col flex-1 justify-center px-12 xl:px-16 py-16">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="h-9 w-9 rounded-lg bg-[#13ec5b]/20 border border-[#13ec5b]/30 flex items-center justify-center">
              <Scissors size={18} className="text-[#13ec5b]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Agenndo</span>
          </div>
          <h2 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-white max-w-sm mb-4">
            Um ambiente pensado para o seu negócio crescer
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Em poucos passos você configura sua agenda, serviços e começa a receber agendamentos no celular dos seus clientes.
          </p>
        </div>
      </aside>

      {/* Coluna do formulário */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:flex lg:items-center lg:justify-center lg:py-8 bg-[#020403]">
        {/* Background glow: só na coluna do form */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 blur-[140px] rounded-full pointer-events-none lg:left-[58%]" />

        {/* Header mobile */}
        <header className="relative z-10 py-5 px-6 border-b border-white/5 lg:border-0 lg:absolute lg:top-0 lg:left-0 lg:right-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold">Agenndo</span>
            </Link>
            <span className="text-sm text-gray-500">Passo {step} de {totalSteps}</span>
          </div>
        </header>

        {/* Progress bar */}
        <div className="relative z-10 h-1 bg-white/5">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10 w-full">
          <div className="w-full max-w-lg lg:max-w-[420px] lg:mx-auto lg:shadow-xl lg:rounded-2xl lg:border lg:border-white/10 lg:bg-[#0d2316] lg:p-6 lg:max-h-[90vh] lg:overflow-y-auto">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-10">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i + 1 === step
                      ? "w-8 h-2.5 bg-primary"
                      : i + 1 < step
                      ? "w-2.5 h-2.5 bg-primary/60"
                      : "w-2.5 h-2.5 bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest text-center mb-6">
              {stepLabel}
            </p>

          {/* Step content */}
          {step === 1 && (
            <Step1
              data={data}
              update={updateData}
              segments={SEGMENTS}
              slugTaken={slugTaken}
              slugChecking={slugChecking}
            />
          )}
          {step === 2 && (
            <Step2 data={data} update={updateData} />
          )}
          {step === 3 && (
            <Step3 data={data} update={updateData} />
          )}
          {step === 4 && (
            <Step4 data={data} update={updateData} colors={COLORS} />
          )}
          {step === 5 && (
            <Step5
              data={data}
              dynamicPlan={effectivePlan}
              onStartTrial={() => void handleFinish("free")}
            />
          )}

          {/* Navigation */}
          {step < 5 && (
            <div className="flex items-center gap-4 mt-8">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={22} className="text-white/70" />
                  Voltar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={
                  step === 1 &&
                  (!data.businessName.trim() ||
                    !data.slug.trim() ||
                    data.slug.trim().length < 2 ||
                    slugTaken === true ||
                    slugChecking)
                }
                className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2"
              >
                Continuar
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

// Step 1 - Business info
function Step1({
  data,
  update,
  segments,
  slugTaken,
  slugChecking,
}: {
  data: SetupFormData;
  update: (f: string, v: unknown) => void;
  segments: string[];
  slugTaken: boolean | null;
  slugChecking: boolean;
}) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Sobre seu negócio</h1>
        <p className="text-gray-400 text-sm">Vamos configurar seu perfil profissional</p>
      </div>

      <div className="space-y-5">
        <FormField label="Nome do negócio" required>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            placeholder="Ex.: nome do seu negócio"
            className="w-full h-12 bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors text-sm"
          />
        </FormField>

        <FormField label="Nome de usuário (Seu link público. Edite!)" required>
          <input
            type="text"
            value={data.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="ex.: meu-estudio"
            autoComplete="off"
            spellCheck={false}
            className="w-full h-12 bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-primary">link</span>
            agenndo.com.br/{data.slug || "…"}
          </p>
          {data.slug.trim().length >= 2 && slugChecking ? (
            <p className="text-[11px] text-gray-500 mt-1">Verificando…</p>
          ) : null}
          {slugTaken === true ? (
            <p className="text-[11px] text-amber-400 mt-1">Este endereço já está em uso. Altere o nome de usuário.</p>
          ) : null}
        </FormField>

        <FormField label="Segmento">
          <select
            value={data.segment}
            onChange={(e) => update("segment", e.target.value)}
            className="w-full h-12 bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 text-white outline-none transition-colors text-sm appearance-none"
          >
            <option value="">Selecione o segmento</option>
            {segments.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Telefone">
          <input
            type="tel"
            value={formatBrazilPhoneFromDigits(data.phone)}
            onChange={(e) => update("phone", phoneDigitsOnly(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            className="w-full h-12 bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors text-sm"
          />
        </FormField>
      </div>
    </div>
  );
}

// Step 2 - Team size
function Step2({ data, update }: { data: { teamSize: string }, update: (f: string, v: unknown) => void }) {
  const options = [
    { value: "1", label: "Só eu", desc: "Trabalho sozinho", icon: "person" },
    { value: "2-5", label: "2 a 5 pessoas", desc: "Pequena equipe", icon: "group" },
    { value: "6-15", label: "6 a 15 pessoas", desc: "Equipe média", icon: "groups" },
    { value: "16+", label: "Mais de 15", desc: "Grande equipe", icon: "corporate_fare" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Tamanho da equipe</h1>
        <p className="text-gray-400 text-sm">Quantas pessoas trabalham no seu negócio?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("teamSize", opt.value)}
            className={`p-5 rounded-xl border text-left transition-all duration-200 ${
              data.teamSize === opt.value
                ? "bg-primary/10 border-primary"
                : "bg-[#14221A] border-[#213428] hover:border-white/20"
            }`}
          >
            <span className={`material-symbols-outlined text-3xl mb-3 block ${
              data.teamSize === opt.value ? "text-primary" : "text-gray-400"
            }`}>
              {opt.icon}
            </span>
            <p className={`font-bold text-sm mb-1 ${
              data.teamSize === opt.value ? "text-white" : "text-gray-300"
            }`}>
              {opt.label}
            </p>
            <p className="text-xs text-gray-500">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 3 - Volume
function Step3({ data, update }: { data: { dailyAppointments: number; averageTicket: number }, update: (f: string, v: unknown) => void }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Volume de trabalho</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Ajudam a entender seu perfil e o <span className="text-primary font-medium">valor mensal sugerido</span> quando
          você decidir assinar. O ticket médio pesa mais do que só a quantidade de atendimentos no dia.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-gray-300">Atendimentos por dia</label>
            <span className="text-primary font-bold text-lg">{data.dailyAppointments}</span>
          </div>
          <input
            type="range"
            min="1"
            max="60"
            value={data.dailyAppointments}
            onChange={(e) => update("dailyAppointments", Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>30</span>
            <span>60+</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-gray-300">Ticket médio por atendimento</label>
            <span className="text-primary font-bold text-lg">R$ {data.averageTicket}</span>
          </div>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={data.averageTicket}
            onChange={(e) => update("averageTicket", Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>R$ 20</span>
            <span>R$ 150</span>
            <span>R$ 500+</span>
          </div>
        </div>

        {/* Monthly estimate */}
        <div className="bg-[#14221A] border border-[#213428] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Estimativa mensal (22 dias úteis)</p>
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-400">Atendimentos</p>
              <p className="text-lg font-bold text-white">{data.dailyAppointments * 22}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Receita potencial</p>
              <p className="text-lg font-bold text-primary">
                R$ {(data.dailyAppointments * 22 * data.averageTicket).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4 - Customization
function Step4({ data, update, colors }: { data: { primaryColor: string; businessName: string; slug: string }, update: (f: string, v: unknown) => void, colors: { value: string; label: string }[] }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Personalização rápida</h1>
        <p className="text-gray-400 text-sm">Escolha a cor da sua página pública</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-3">Cor principal</label>
          <div className="grid grid-cols-4 gap-3">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => update("primaryColor", color.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  data.primaryColor === color.value
                    ? "border-white/40 bg-white/5"
                    : "border-transparent hover:border-white/10"
                }`}
              >
                <div
                  className="size-10 rounded-full"
                  style={{ backgroundColor: color.value, boxShadow: data.primaryColor === color.value ? `0 0 15px ${color.value}60` : "none" }}
                />
                <span className="text-xs text-gray-400">{color.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#14221A] border border-[#213428] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">Preview da sua página pública</p>
          <div className="bg-[#080c0a] rounded-lg p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-full flex items-center justify-center text-black font-bold text-sm"
                style={{ backgroundColor: data.primaryColor }}
              >
                {data.businessName[0]?.toUpperCase() || "A"}
              </div>
              <div>
                <p className="text-white text-sm font-bold">{data.businessName || "Meu Negócio"}</p>
                <p className="text-gray-500 text-xs">agenndo.com.br/{data.slug || "meu-negocio"}</p>
              </div>
            </div>
            <button
              className="w-full py-2 rounded-lg text-sm font-bold text-black transition-all"
              style={{ backgroundColor: data.primaryColor }}
            >
              Agendar agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 5 — teste primeiro (`effectivePlan` via `resolveEffectiveDynamicPlan`, sem microcopiar regra técnica)
function Step5({
  data,
  dynamicPlan,
  onStartTrial,
}: {
  data: { businessName: string };
  dynamicPlan: {
    tier: PlanId;
    monthlyPrice: number;
    infrastructure: string;
    highlight: string;
    features: { title: string; sub: string }[];
  };
  onStartTrial: () => void;
}) {
  const waTrialHref = useMemo(() => {
    const text = encodeURIComponent(
      `Olá! Estou iniciando o teste do Agenndo (${data.businessName || "meu negócio"}) e gostaria de falar sobre a duração do período gratuito.`
    );
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
  }, [data.businessName]);

  const priceFmt = `R$ ${dynamicPlan.monthlyPrice.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Comece pelo teste gratuito</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Entre e use sem cartão para explorar o Agenndo. Se gostar, você poderá assinar depois pelo painel pelo valor mensal de (<span className="text-white/90">{priceFmt}</span>). Com Infraestrutura de Software dedicada ao seu negócio.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/35 bg-[#14221A] p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-2xl shrink-0">rocket_launch</span>
          <div>
            <p className="text-sm font-bold text-white">Período de teste sem pressa</p>
            <p className="text-xs text-gray-400 mt-1 leading-snug">
              Em geral <span className="text-gray-300">7 dias ou mais</span> com acesso completo. Precisa avaliar com calma?
              Chame o suporte e combine extensão (até cerca de 1 mês, caso a caso).
            </p>
            <a
              href={waTrialHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:brightness-110"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              Falar no WhatsApp sobre o trial
            </a>
          </div>
        </div>

        <div className="rounded-xl bg-[#080c0a]/90 border border-white/10 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Depois do teste, se você quiser continuar</p>
          <p className="text-lg font-extrabold text-white mt-1 tabular-nums">
            {priceFmt}
            <span className="text-sm font-medium text-gray-400"> /mês</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-2 leading-snug">
            Cobrança recorrente no cartão (via Stripe com qualquer cartão) apenas quando você ativar o plano pago. Ou seja, gostou do Agenndo, do suporte e das atualizações? Assine e aproveite!
          </p>
        </div>
      </div>

      <SetupCollapsible title="O que está incluído no plano completo">
        {dynamicPlan.infrastructure.trim() ? (
          <p className="text-xs text-primary font-medium mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">bolt</span>
            {dynamicPlan.infrastructure}
          </p>
        ) : null}
        {dynamicPlan.highlight.trim() ? <p className="text-xs text-gray-500 mb-3">{dynamicPlan.highlight}</p> : null}
        <ul className="space-y-3">
          {dynamicPlan.features.map((f) => (
            <li key={f.title} className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
              <div>
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-xs text-gray-500">{f.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </SetupCollapsible>

      <button
        type="button"
        onClick={onStartTrial}
        className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2"
      >
        Entrar no teste gratuito
        <span className="material-symbols-outlined text-base">rocket_launch</span>
      </button>

      <p className="text-[11px] text-gray-500 text-center leading-relaxed">
        Ao entrar você concorda com os{" "}
        <Link href="/termos" className="text-primary font-semibold hover:underline">
          Termos de Uso
        </Link>
        . A assinatura paga fica no painel, quando você quiser.
      </p>
    </div>
  );
}

function SetupCollapsible({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-[#213428] bg-[#14221A]/70 overflow-hidden open:border-[#2a4534] [&_summary::-webkit-details-marker]:hidden">
      <summary className="cursor-pointer list-none px-4 py-3.5 hover:bg-white/[0.04] transition-colors flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle ? <p className="text-[11px] text-gray-500 mt-1 leading-snug">{subtitle}</p> : null}
        </div>
        <span className="material-symbols-outlined text-gray-500 text-xl shrink-0 transition-transform duration-200 group-open:rotate-180">
          expand_more
        </span>
      </summary>
      <div className="border-t border-white/[0.06] px-4 py-3">{children}</div>
    </details>
  );
}

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-300 block mb-1.5">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
