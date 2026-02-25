"use client";

import { useState } from "react";

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
  const [config, setConfig] = useState<NotifConfig>(DEFAULT_CONFIG);
  const [activeTemplate, setActiveTemplate] = useState<"confirmacao" | "lembrete" | "avaliacao" | "reativacao">("confirmacao");

  const templates = {
    confirmacao: `Olá {nome}! ✅ Seu agendamento foi confirmado.\n📅 {data} às {hora}\n💇 {servico} com {colaborador}\n📍 {endereco}\n\nPara cancelar: {link}`,
    lembrete: `Olá {nome}! 👋 Lembrete: você tem um agendamento amanhã.\n📅 {data} às {hora}\n💇 {servico} com {colaborador}\n\nAté logo!`,
    avaliacao: `Olá {nome}! Como foi seu atendimento? ⭐\nGostaríamos de saber sua opinião. Avalie em: {link}`,
    reativacao: `Olá {nome}! Sentimos sua falta! 💇\nFaz um tempo que não te vemos. Que tal agendar? {link}`,
  };

  const [templateTexts, setTemplateTexts] = useState(templates);

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
        checked ? "bg-primary" : "bg-gray-200"
      }`}
    >
      <span
        className="inline-block size-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
        <p className="text-gray-600 text-sm mt-1">Configure alertas para você e lembretes para seus clientes</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-base">store</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Suas notificações</h2>
                <p className="text-xs text-gray-500">Alertas para o prestador</p>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
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
                    <span className="material-symbols-outlined text-gray-400 text-base">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={config[item.key] as boolean}
                    onChange={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Client notifications */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <div className="size-9 rounded-lg bg-blue-400/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 text-base">group</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Notificações dos clientes</h2>
                <p className="text-xs text-gray-500">Mensagens automáticas enviadas</p>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
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
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={config[item.key] as boolean}
                    onChange={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                  />
                </div>
              ))}
            </div>

            {/* Reactivation days slider */}
            {config.clientReactivation && (
              <div className="p-4 border-t border-gray-200 bg-purple-400/5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-300">Dias de inatividade para reativar</label>
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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Templates de mensagem</h2>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                {[
                  { key: "confirmacao", label: "Confirmação" },
                  { key: "lembrete", label: "Lembrete" },
                  { key: "avaliacao", label: "Avaliação" },
                  { key: "reativacao", label: "Reativação" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTemplate(t.key as typeof activeTemplate)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                      activeTemplate === t.key ? "bg-primary text-black" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
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
                className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-3 text-gray-900 text-sm outline-none transition-colors resize-none font-mono leading-relaxed"
              />

              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Variáveis disponíveis:</p>
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
                      className="px-2 py-1 bg-gray-100 hover:bg-primary/20 hover:text-primary text-gray-600 text-xs rounded-lg border border-gray-200 hover:border-primary/30 transition-all font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">preview</span>
                  Preview (com dados reais)
                </p>
                <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                  {templateTexts[activeTemplate]
                    .replace("{nome}", "João Silva")
                    .replace("{data}", "24/01/2024")
                    .replace("{hora}", "14:00")
                    .replace("{servico}", "Corte + Barba")
                    .replace("{colaborador}", "Carlos")
                    .replace("{endereco}", "Rua das Flores, 123")
                    .replace("{link}", "agenndo.com/cancel/abc123")}
                </p>
              </div>

              <button className="w-full mt-3 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">restore</span>
                Restaurar padrão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
