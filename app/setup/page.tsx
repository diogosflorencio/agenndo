"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, ArrowLeft } from "lucide-react";
import { type PlanId } from "@/lib/plans";
import { calculateDynamicPlan } from "@/lib/planCalculator";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const SEGMENTS = [
  "Barbearia", "Salão de Beleza", "Manicure / Pedicure", "Clínica de Estética",
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

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SetupFormData>({
    businessName: "",
    segment: "",
    phone: "",
    slug: "",
    teamSize: "1" as "1" | "2-5" | "6-15" | "16+",
    dailyAppointments: 10,
    averageTicket: 70,
    primaryColor: "#13EC5B",
    logo: null as File | null,
  });

  const totalSteps = 5;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  const dynamicPlan = calculateDynamicPlan(
    data.teamSize,
    data.dailyAppointments,
    data.averageTicket
  );

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async (planId: PlanId) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/setup");
      return;
    }

    const slug = data.slug || slugify(data.businessName) || "meu-negocio";
    const { error: bizError } = await supabase.from("businesses").insert({
      profile_id: user.id,
      name: data.businessName || "Meu Negócio",
      slug,
      segment: data.segment || null,
      phone: data.phone ? formatPhone(data.phone) : null,
      primary_color: data.primaryColor || "#13EC5B",
      plan: planId,
    });

    if (bizError) {
      console.error(bizError);
      // Slug duplicado ou outro erro: ainda salva no localStorage para não travar o fluxo
      localStorage.setItem("agenndo_setup_complete", "true");
      localStorage.setItem("agenndo_plan", planId);
      if (planId !== "free") {
        localStorage.setItem("agenndo_plan_price", String(dynamicPlan.monthlyPrice));
      }
      window.location.href = "/dashboard";
      return;
    }

    localStorage.setItem("agenndo_setup_complete", "true");
    localStorage.setItem("agenndo_plan", planId);
    if (planId !== "free") {
      localStorage.setItem("agenndo_plan_price", String(dynamicPlan.monthlyPrice));
    }
    // Redirecionamento completo para garantir que o servidor receba os cookies e veja o negócio recém-criado
    window.location.href = "/dashboard";
  };

  const updateData = (field: string, value: unknown) => {
    setData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "businessName") {
        updated.slug = slugify(value as string);
      }
      return updated;
    });
  };

  const stepLabel = step === 1 ? "Negócio" : step === 2 ? "Equipe" : step === 3 ? "Volume" : step === 4 ? "Aparência" : "Plano";

  return (
    <div className="min-h-screen bg-[#102216] text-white flex flex-col lg:flex-row">
      {/* Painel visual — desktop: lateral esquerda; mobile: oculto */}
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
            <span className="text-xl font-bold tracking-tight text-white">Agenndar</span>
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
        {/* Background glow — só na coluna do form */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 blur-[140px] rounded-full pointer-events-none lg:left-[58%]" />

        {/* Header — mobile */}
        <header className="relative z-10 py-5 px-6 border-b border-white/5 lg:border-0 lg:absolute lg:top-0 lg:left-0 lg:right-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
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
            {/* Step indicator — estilo alinhado ao que você pediu */}
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
            <Step1 data={data} update={updateData} segments={SEGMENTS} />
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
            <Step5 data={data} dynamicPlan={dynamicPlan} onFinish={handleFinish} onFree={() => handleFinish("free")} />
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
                disabled={step === 1 && !data.businessName}
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
function Step1({ data, update, segments }: { data: SetupFormData; update: (f: string, v: unknown) => void; segments: string[] }) {
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
            placeholder="Ex: Barbearia Elite"
            className="w-full h-12 bg-[#14221A] border border-[#213428] focus:border-primary rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors text-sm"
          />
          {data.businessName && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary">link</span>
              agenndo.com/{data.slug}
            </p>
          )}
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
            value={formatPhone(data.phone)}
            onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
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
        <p className="text-gray-400 text-sm">Isso nos ajuda a recomendar o plano ideal</p>
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
                <p className="text-gray-500 text-xs">agenndo.com/{data.slug || "meu-negocio"}</p>
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

// Step 5 - Plano dinâmico: usuário só vê a opção destinada ao perfil
function Step5({
  data,
  dynamicPlan,
  onFinish,
  onFree,
}: {
  data: { businessName: string; teamSize: string; dailyAppointments: number; averageTicket: number };
  dynamicPlan: { tier: PlanId; monthlyPrice: number; infrastructure: string; highlight: string; features: { title: string; sub: string }[] };
  onFinish: (plan: PlanId) => void;
  onFree: () => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Seu plano ideal</h1>
        <p className="text-gray-400 text-sm">
          Com base no seu perfil, preparamos a infraestrutura ideal para{" "}
          <span className="text-primary font-semibold">{data.businessName || "seu negócio"}</span>
        </p>
      </div>

      <div className="bg-[#14221A] border border-primary/30 rounded-2xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-primary px-3 py-1 rounded-bl-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#102216]">Recomendado</p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-lg">bolt</span>
          <p className="text-sm font-semibold text-primary">{dynamicPlan.infrastructure}</p>
        </div>
        <p className="text-gray-400 text-sm mb-4">{dynamicPlan.highlight}</p>
        <ul className="space-y-3 mb-5">
          {dynamicPlan.features.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-base mt-0.5">check_circle</span>
              <div>
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-xs text-gray-500">{f.sub}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Investimento mensal</p>
            <p className="text-2xl font-extrabold text-white">
              R$ {dynamicPlan.monthlyPrice.toFixed(2).replace(".", ",")}
              <span className="text-sm font-normal text-gray-400">/mês</span>
            </p>
          </div>
          <div className="text-right">
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
              <p className="text-xs font-bold text-primary">7 dias grátis</p>
              <p className="text-[10px] text-gray-400">sem cartão de crédito</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onFinish(dynamicPlan.tier)}
        className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2"
      >
        Começar agora — 7 dias grátis
        <span className="material-symbols-outlined text-base">arrow_forward</span>
      </button>
      <button
        type="button"
        onClick={onFree}
        className="w-full mt-3 py-3 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        Continuar com o plano básico gratuito
      </button>
      <p className="text-xs text-gray-500 text-center mt-4">
        Todos os planos incluem 7 dias de trial completo. Sem cobrança agora.
      </p>
    </div>
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
