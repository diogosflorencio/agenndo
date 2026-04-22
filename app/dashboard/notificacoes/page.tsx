"use client";

import { useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { SwitchToggle } from "@/components/switch-toggle";
import { cn } from "@/lib/utils";

type NotifConfig = {
  newAppointmentEmail: boolean;
  newAppointmentPush: boolean;
  dailySummary: boolean;
  cancellationAlert: boolean;
  clientConfirmation: boolean;
  clientReminder24h: boolean;
  clientReminder1h: boolean;
  clientReview: boolean;
  clientReactivation: boolean;
  reactivationDays: number;
};

const DEFAULT_CONFIG: NotifConfig = {
  newAppointmentEmail: true,
  newAppointmentPush: true,
  dailySummary: true,
  cancellationAlert: true,
  clientConfirmation: true,
  clientReminder24h: true,
  clientReminder1h: false,
  clientReview: true,
  clientReactivation: false,
  reactivationDays: 60,
};

const TEMPLATE_VARS = ["{nome}", "{data}", "{hora}", "{servico}", "{colaborador}", "{endereco}", "{link}"];

export default function NotificacoesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [config, setConfig] = useState<NotifConfig>(DEFAULT_CONFIG);
  const [activeTemplate, setActiveTemplate] = useState<"confirmacao" | "lembrete" | "avaliacao" | "reativacao">("confirmacao");

  const templates = {
    confirmacao: `Olá {nome}! ✅ Seu agendamento foi confirmado.\n📅 {data} às {hora}\n💇 {servico} com {colaborador}\n📍 {endereco}\n\nPara cancelar: {link}`,
    lembrete: `Olá {nome}! 👋 Lembrete: você tem um agendamento amanhã.\n📅 {data} às {hora}\n💇 {servico} com {colaborador}\n\nAté logo!`,
    avaliacao: `Olá {nome}! Como foi seu atendimento? ⭐\nGostaríamos de saber sua opinião. Avalie em: {link}`,
    reativacao: `Olá {nome}! Sentimos sua falta! 💇\nFaz um tempo que não te vemos. Que tal agendar? {link}`,
  };

  const [templateTexts, setTemplateTexts] = useState(templates);

  const card = cn(
    "rounded-xl overflow-hidden shadow-sm border",
    isDark ? "bg-[#111318] border-white/[0.08]" : "bg-white border-gray-200"
  );
  const cardHeadBorder = isDark ? "border-white/[0.08]" : "border-gray-200";
  const pageTitle = isDark ? "text-white" : "text-gray-900";
  const pageSub = isDark ? "text-gray-400" : "text-gray-600";
  const itemTitle = isDark ? "text-white" : "text-gray-900";
  const itemDesc = isDark ? "text-gray-400" : "text-gray-500";
  const iconMuted = isDark ? "text-gray-500" : "text-gray-400";
  const inputSurface = isDark
    ? "bg-black/25 border-white/[0.08] text-white placeholder:text-gray-500"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";
  const chipBtn = isDark
    ? "bg-white/[0.06] hover:bg-white/10 text-gray-300 border-white/[0.08] hover:border-primary/30"
    : "bg-gray-100 hover:bg-primary/20 text-gray-600 border-gray-200 hover:border-primary/30";
  const ghostBtn = isDark
    ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-gray-200"
    : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700";

  return (
    <div className="relative w-full min-h-[min(70vh,520px)]">
      <div
        className={cn(
          "pointer-events-none select-none",
          isDark ? "opacity-[0.38]" : "opacity-[0.68] blur-[1px]"
        )}
        aria-hidden="true"
      >
        <div className="mb-6">
          <h1 className={cn("text-2xl font-bold", pageTitle)}>Notificações</h1>
          <p className={cn("text-sm mt-1", pageSub)}>Configure alertas para você e lembretes para seus clientes</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className={card}>
            <div className={cn("flex items-center gap-3 p-4 border-b", cardHeadBorder)}>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-base">store</span>
              </div>
              <div>
                <h2 className={cn("text-sm font-bold", itemTitle)}>Suas notificações</h2>
                <p className={cn("text-xs", itemDesc)}>Alertas para o prestador</p>
              </div>
            </div>

            <div
              className={
                isDark ? "divide-y divide-white/[0.06]" : "divide-y divide-gray-200"
              }
            >
              {[
                {
                  key: "newAppointmentEmail" as keyof NotifConfig,
                  label: "Novo agendamento",
                  desc: "Receber por e-mail",
                  icon: "email",
                },
                {
                  key: "newAppointmentPush" as keyof NotifConfig,
                  label: "Novo agendamento",
                  desc: "Notificação push (browser)",
                  icon: "notifications",
                },
                {
                  key: "dailySummary" as keyof NotifConfig,
                  label: "Resumo diário às 7h",
                  desc: "Lista de agendamentos do dia",
                  icon: "today",
                },
                {
                  key: "cancellationAlert" as keyof NotifConfig,
                  label: "Alerta de cancelamento",
                  desc: "Quando cliente cancela",
                  icon: "event_busy",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={cn("material-symbols-outlined text-base", iconMuted)}>{item.icon}</span>
                    <div>
                      <p className={cn("text-sm font-medium", itemTitle)}>{item.label}</p>
                      <p className={cn("text-xs", itemDesc)}>{item.desc}</p>
                    </div>
                  </div>
                  <SwitchToggle
                    checked={config[item.key] as boolean}
                    onChange={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                    trackOffClassName={isDark ? "bg-gray-500" : "bg-gray-300"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Client notifications */}
          <div className={card}>
            <div className={cn("flex items-center gap-3 p-4 border-b", cardHeadBorder)}>
              <div className="size-9 rounded-lg bg-blue-400/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 text-base">group</span>
              </div>
              <div>
                <h2 className={cn("text-sm font-bold", itemTitle)}>Notificações dos clientes</h2>
                <p className={cn("text-xs", itemDesc)}>Mensagens automáticas enviadas</p>
              </div>
            </div>

            <div
              className={
                isDark ? "divide-y divide-white/[0.06]" : "divide-y divide-gray-200"
              }
            >
              {[
                {
                  key: "clientConfirmation" as keyof NotifConfig,
                  label: "Confirmação de agendamento",
                  desc: "E-mail + WhatsApp (se habilitado)",
                  icon: "check_circle",
                  color: "text-primary",
                },
                {
                  key: "clientReminder24h" as keyof NotifConfig,
                  label: "Lembrete 24h antes",
                  desc: "E-mail + WhatsApp",
                  icon: "schedule",
                  color: "text-blue-400",
                },
                {
                  key: "clientReminder1h" as keyof NotifConfig,
                  label: "Lembrete 1h antes",
                  desc: "WhatsApp",
                  icon: "alarm",
                  color: "text-yellow-400",
                },
                {
                  key: "clientReview" as keyof NotifConfig,
                  label: "Solicitação de avaliação",
                  desc: "24h após o atendimento",
                  icon: "star",
                  color: "text-yellow-400",
                },
                {
                  key: "clientReactivation" as keyof NotifConfig,
                  label: "Mensagem de reativação",
                  desc: `Clientes inativos há +${config.reactivationDays} dias`,
                  icon: "person_search",
                  color: "text-purple-400",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-base ${item.color}`}>{item.icon}</span>
                    <div>
                      <p className={cn("text-sm font-medium", itemTitle)}>{item.label}</p>
                      <p className={cn("text-xs", itemDesc)}>{item.desc}</p>
                    </div>
                  </div>
                  <SwitchToggle
                    checked={config[item.key] as boolean}
                    onChange={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                    trackOffClassName={isDark ? "bg-gray-600" : "bg-gray-300"}
                  />
                </div>
              ))}
            </div>

            {/* Reactivation days slider */}
            {config.clientReactivation && (
              <div
                className={`p-4 border-t bg-purple-400/5 ${
                  isDark ? "border-white/[0.06]" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <label
                    className={`text-xs font-medium ${isDark ? "text-white/70" : "text-gray-700"}`}
                  >
                    Dias de inatividade para reativar
                  </label>
                  <span className="text-purple-400 font-bold text-sm">{config.reactivationDays} dias</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={180}
                  step={7}
                  value={config.reactivationDays}
                  onChange={(e) => setConfig({ ...config, reactivationDays: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <button className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">save</span>
            Salvar configurações
          </button>
        </div>

        {/* Right: Templates */}
        <div>
          <div className={card}>
            <div className={cn("p-4 border-b", cardHeadBorder)}>
              <h2 className={cn("text-sm font-bold mb-3", itemTitle)}>Templates de mensagem</h2>
              <div
                className={`flex gap-1 p-1 rounded-lg ${
                  isDark ? "bg-white/[0.06]" : "bg-gray-100"
                }`}
              >
                {[
                  { key: "confirmacao", label: "Confirmação" },
                  { key: "lembrete", label: "Lembrete" },
                  { key: "avaliacao", label: "Avaliação" },
                  { key: "reativacao", label: "Reativação" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTemplate(t.key as typeof activeTemplate)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                      activeTemplate === t.key
                        ? "bg-primary text-black"
                        : isDark
                          ? "text-white/60 hover:text-white hover:bg-white/10"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              <textarea
                value={templateTexts[activeTemplate]}
                onChange={(e) =>
                  setTemplateTexts({ ...templateTexts, [activeTemplate]: e.target.value })
                }
                rows={7}
                className={cn(
                  "w-full border focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none font-mono leading-relaxed",
                  inputSurface
                )}
              />

              <div className="mt-3">
                <p className={cn("text-xs mb-2", itemDesc)}>Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        setTemplateTexts({
                          ...templateTexts,
                          [activeTemplate]: templateTexts[activeTemplate] + v,
                        })
                      }
                      className={cn(
                        "px-2 py-1 hover:bg-primary/20 hover:text-primary text-xs rounded-lg border transition-all font-mono",
                        chipBtn
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div
                className={cn(
                  "mt-4 rounded-xl border p-3",
                  isDark ? "bg-black/20 border-white/[0.08]" : "bg-gray-50 border-gray-200"
                )}
              >
                <p className={cn("text-xs mb-2 flex items-center gap-1", itemDesc)}>
                  <span className="material-symbols-outlined text-xs">preview</span>
                  Preview (com dados reais)
                </p>
                <p
                  className={cn(
                    "text-xs whitespace-pre-line leading-relaxed",
                    isDark ? "text-gray-200" : "text-gray-700"
                  )}
                >
                  {templateTexts[activeTemplate]
                    .replace("{nome}", "João Silva")
                    .replace("{data}", "24/01/2024")
                    .replace("{hora}", "14:00")
                    .replace("{servico}", "Corte + Barba")
                    .replace("{colaborador}", "Carlos")
                    .replace("{endereco}", "Rua das Flores, 123")
                    .replace("{link}", "agenndo.com.br/cancel/abc123")}
                </p>
              </div>

              <button
                type="button"
                className={cn(
                  "w-full mt-3 py-2.5 border text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2",
                  ghostBtn
                )}
              >
                <span className="material-symbols-outlined text-sm">restore</span>
                Restaurar padrão
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center px-4 py-10",
          isDark ? "bg-black/50 backdrop-blur-xl" : "bg-slate-900/[0.12] backdrop-blur-md"
        )}
        role="status"
        aria-live="polite"
      >
        <div
          className={cn(
            "max-w-md w-full rounded-2xl border px-6 py-6 text-center shadow-2xl",
            isDark ? "border-white/[0.1] bg-[#151921]/95 text-white" : "border-gray-200/90 bg-white/95 text-gray-900"
          )}
        >
          <span className="material-symbols-outlined text-4xl text-primary mb-3 block" aria-hidden>
            hourglass_top
          </span>
          <p className="font-bold text-lg tracking-tight">Em breve</p>
          <p className={cn("text-sm mt-2 leading-relaxed", isDark ? "text-gray-300" : "text-gray-600")}>
            Estamos finalizando envio automático, templates e preferências. Em breve você configura tudo por aqui, com
            a mesma experiência no tema claro e escuro.
          </p>
        </div>
      </div>
    </div>
  );
}
