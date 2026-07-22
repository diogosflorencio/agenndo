"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { cn, formatBrazilPhoneFromDigits } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";
import { useRegisterDashboardUnsavedNavigation, GuardedDashboardLink } from "@/lib/dashboard-navigation-guard";
import { SwitchToggle } from "@/components/switch-toggle";
import { useAppAlert } from "@/components/app-alert-provider";
import {
  WHATSAPP_EVENTS,
  WHATSAPP_CLIENT_GROUPS,
  listWhatsAppEventsByCategory,
  listWhatsAppClientEventsByGroup,
  type WhatsAppEventDefinition,
  type WhatsAppClientListGroup,
} from "@/lib/whatsapp/events";
import {
  WHATSAPP_TEMPLATE_VARIABLES,
  buildSampleTemplateContext,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp/variables";
import type { WhatsAppEventKey, WhatsAppRecipientRole, WhatsAppSessionStatus } from "@/lib/whatsapp/types";

type SettingsForm = {
  masterEnabled: boolean;
  notifyOwnerOnNewBooking: boolean;
  notifyOwnerOnCancellation: boolean;
  notifyOwnerOnPayment: boolean;
  notifyStaffOnNewBooking: boolean;
  notifyStaffOnCancellation: boolean;
  defaultCountryCode: string;
  ownerNotificationPhone: string;
};

type TemplateFormItem = {
  eventKey: WhatsAppEventKey;
  recipientRole: WhatsAppRecipientRole;
  enabled: boolean;
  body: string;
  scheduleKind: "immediate" | "before_appointment" | "after_appointment";
  scheduleOffsetMinutes: number | null;
};

type CategoryTab = "cliente" | "empresa" | "profissional";

const CATEGORY_TABS: { id: CategoryTab; label: string; icon: string }[] = [
  { id: "cliente", label: "Clientes", icon: "group" },
  { id: "empresa", label: "Para você", icon: "store" },
  { id: "profissional", label: "Profissionais", icon: "badge" },
];

function templateKey(eventKey: string, role: string) {
  return `${eventKey}:${role}`;
}

function buildDefaultTemplates(): TemplateFormItem[] {
  return WHATSAPP_EVENTS.map((e) => ({
    eventKey: e.key,
    recipientRole: e.recipientRole,
    enabled: e.defaultEnabled,
    body: e.defaultBody,
    scheduleKind: e.scheduleKind,
    scheduleOffsetMinutes: e.scheduleOffsetMinutes,
  }));
}

function scheduleLabel(kind: TemplateFormItem["scheduleKind"], offsetMinutes: number | null): string | null {
  if (kind === "immediate" || offsetMinutes == null) return null;
  const abs = Math.abs(offsetMinutes);
  if (abs >= 1440 && abs % 1440 === 0) {
    const days = abs / 1440;
    return kind === "before_appointment" ? `${days}d antes` : `${days}d depois`;
  }
  if (abs >= 60 && abs % 60 === 0) {
    const h = abs / 60;
    return kind === "before_appointment" ? `${h}h antes` : `${h}h depois`;
  }
  return kind === "before_appointment" ? `${abs} min antes` : `${abs} min depois`;
}

const DEFAULT_SETTINGS: SettingsForm = {
  masterEnabled: false,
  notifyOwnerOnNewBooking: true,
  notifyOwnerOnCancellation: true,
  notifyOwnerOnPayment: true,
  notifyStaffOnNewBooking: false,
  notifyStaffOnCancellation: false,
  defaultCountryCode: "55",
  ownerNotificationPhone: "",
};

export default function WhatsAppDashboardPage() {
  const { business } = useDashboard();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
  const { showAlert } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [uiMode, setUiMode] = useState<"dev" | "coming_soon" | "live">("coming_soon");
  const [sessionStatus, setSessionStatus] = useState<WhatsAppSessionStatus>("disconnected");
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>("cliente");
  const [activeClientGroup, setActiveClientGroup] = useState<WhatsAppClientListGroup>("agendamento");
  const [activeEventKey, setActiveEventKey] = useState(templateKey("booking_confirmed", "client"));

  const [settings, setSettings] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<TemplateFormItem[]>(buildDefaultTemplates());
  const [savedBaseline, setSavedBaseline] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDirty = savedBaseline !== null && savedBaseline !== JSON.stringify({ settings, templates });
  const isComingSoon = uiMode === "coming_soon";
  const isDev = uiMode === "dev";

  const sampleContext = useMemo(
    () =>
      buildSampleTemplateContext({
        business: business
          ? { slug: business.slug, name: business.name, phone: business.phone, city: business.city }
          : null,
        siteBase: typeof window !== "undefined" ? window.location.origin : undefined,
      }),
    [business?.slug, business?.name, business?.phone, business?.city]
  );
  const tabEvents = useMemo(() => {
    if (activeTab === "cliente") return listWhatsAppClientEventsByGroup(activeClientGroup);
    return listWhatsAppEventsByCategory(activeTab);
  }, [activeTab, activeClientGroup]);

  const activeTemplate = useMemo(() => {
    const [eventKey, recipientRole] = activeEventKey.split(":") as [WhatsAppEventKey, WhatsAppRecipientRole];
    return templates.find((t) => t.eventKey === eventKey && t.recipientRole === recipientRole) ?? templates[0];
  }, [activeEventKey, templates]);

  const activeDefinition = useMemo(() => {
    if (!activeTemplate) return null;
    return WHATSAPP_EVENTS.find(
      (e) => e.key === activeTemplate.eventKey && e.recipientRole === activeTemplate.recipientRole
    );
  }, [activeTemplate]);

  const previewText = useMemo(() => {
    if (!activeTemplate) return "";
    return renderWhatsAppTemplate(activeTemplate.body, sampleContext);
  }, [activeTemplate, sampleContext]);

  const ownerAlertPhoneHint = useMemo(() => {
    if (settings.ownerNotificationPhone.trim()) {
      return "Alertas internos serao enviados para o numero acima.";
    }
    if (sessionPhone) {
      const digits = sessionPhone.replace(/\D/g, "");
      const display = formatBrazilPhoneFromDigits(digits) || `+${sessionPhone.replace(/^\+/, "")}`;
      return `Opcional. Se vazio, alertas vao para o WhatsApp conectado (${display}).`;
    }
    return "Opcional. Se vazio, alertas usam o numero do WhatsApp quando voce conectar.";
  }, [settings.ownerNotificationPhone, sessionPhone]);

  const loadAll = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/dashboard/whatsapp/templates", { method: "POST" }).catch(() => null);
      const res = await fetch("/api/dashboard/whatsapp");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar");

      setUiMode(data.uiMode ?? "coming_soon");

      const nextSettings: SettingsForm = data.settings
        ? {
            masterEnabled: Boolean(data.settings.master_enabled),
            notifyOwnerOnNewBooking: Boolean(data.settings.notify_owner_on_new_booking),
            notifyOwnerOnCancellation: Boolean(data.settings.notify_owner_on_cancellation),
            notifyOwnerOnPayment: Boolean(data.settings.notify_owner_on_payment),
            notifyStaffOnNewBooking: Boolean(data.settings.notify_staff_on_new_booking),
            notifyStaffOnCancellation: Boolean(data.settings.notify_staff_on_cancellation),
            defaultCountryCode: data.settings.default_country_code ?? "55",
            ownerNotificationPhone: data.settings.owner_notification_phone ?? "",
          }
        : DEFAULT_SETTINGS;

      setSettings(nextSettings);

      const sessionRow = data.session ?? data.liveSession;
      if (sessionRow) {
        setSessionStatus(sessionRow.status ?? "disconnected");
        setSessionPhone(sessionRow.phone_e164 ?? sessionRow.phoneE164 ?? null);
      }

      const merged = buildDefaultTemplates();
      for (const row of data.templates ?? []) {
        const idx = merged.findIndex(
          (t) => t.eventKey === row.event_key && t.recipientRole === row.recipient_role
        );
        if (idx >= 0) {
          merged[idx] = {
            eventKey: row.event_key,
            recipientRole: row.recipient_role,
            enabled: Boolean(row.enabled),
            body: row.body ?? merged[idx]!.body,
            scheduleKind: row.schedule_kind ?? merged[idx]!.scheduleKind,
            scheduleOffsetMinutes: row.schedule_offset_minutes ?? merged[idx]!.scheduleOffsetMinutes,
          };
        }
      }
      setTemplates(merged);
      setSavedBaseline(JSON.stringify({ settings: nextSettings, templates: merged }));
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro ao carregar WhatsApp", { title: "WhatsApp" });
    } finally {
      setLoading(false);
    }
  }, [business?.id, showAlert]);

  useEffect(() => {
    if (!business?.id) return;
    void loadAll();
  }, [business?.id, loadAll]);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!business?.id) return false;
    setSaving(true);
    try {
      const settingsRes = await fetch("/api/dashboard/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const settingsData = await settingsRes.json();
      if (!settingsRes.ok) throw new Error(settingsData.error ?? "Falha ao salvar configuracoes");

      const tplRes = await fetch("/api/dashboard/whatsapp/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      const tplData = await tplRes.json();
      if (!tplRes.ok) throw new Error(tplData.error ?? "Falha ao salvar templates");

      setSavedBaseline(JSON.stringify({ settings, templates }));
      showAlert("Configuracoes de WhatsApp salvas.", { title: "WhatsApp" });
      return true;
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro ao salvar", { title: "WhatsApp" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [business?.id, settings, templates, showAlert]);

  useRegisterDashboardUnsavedNavigation(isDirty, saveAll, !!business?.id);

  const sessionAction = async (action: "connect" | "disconnect") => {
    setSessionBusy(true);
    try {
      const res = await fetch("/api/dashboard/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na sessao");
      setSessionStatus(data.status ?? "disconnected");
      setSessionPhone(data.phoneE164 ?? null);
      showAlert(
        action === "connect" ? "Sessao conectada (modo de teste)." : "Sessao desconectada.",
        { title: "WhatsApp" }
      );
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro", { title: "WhatsApp" });
    } finally {
      setSessionBusy(false);
    }
  };

  const simulateSend = async () => {
    if (!activeTemplate) return;
    try {
      const res = await fetch("/api/dashboard/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventKey: activeTemplate.eventKey,
          recipientRole: activeTemplate.recipientRole,
          templateBody: activeTemplate.body,
          processNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na simulacao");
      showAlert("Mensagem simulada enfileirada.", { title: "WhatsApp" });
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro", { title: "WhatsApp" });
    }
  };

  const selectFirstInTab = (tab: CategoryTab, clientGroup?: WhatsAppClientListGroup) => {
    if (tab === "cliente") {
      const group = clientGroup ?? activeClientGroup;
      const first = listWhatsAppClientEventsByGroup(group)[0];
      if (first) setActiveEventKey(templateKey(first.key, first.recipientRole));
      return;
    }
    const first = listWhatsAppEventsByCategory(tab)[0];
    if (first) setActiveEventKey(templateKey(first.key, first.recipientRole));
  };

  const setTemplateEnabled = (ev: WhatsAppEventDefinition, enabled: boolean) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.eventKey === ev.key && t.recipientRole === ev.recipientRole ? { ...t, enabled } : t
      )
    );
  };

  const updateTemplateBody = (body: string) => {
    if (!activeTemplate) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.eventKey === activeTemplate.eventKey && t.recipientRole === activeTemplate.recipientRole
          ? { ...t, body }
          : t
      )
    );
  };

  const card = cn(surfaces.panel, "overflow-hidden");
  const headBorder = isDark ? "border-white/[0.08]" : "border-gray-200";

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[min(70vh,520px)] pb-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className={cn("text-2xl font-bold", surfaces.title)}>WhatsApp</h1>
          <UnsavedChangesIndicator dirty={isDirty} variant="inline" />
        </div>
        <p className={cn("text-sm mt-1 leading-relaxed", surfaces.subtitle)}>
          Conecte o numero do negocio e configure mensagens automaticas para clientes, alertas para voce e para a
          equipe.
        </p>
      </div>

      {isDev ? (
        <div
          className={cn(
            "mb-6 px-4 py-3 rounded-xl border text-sm",
            isDark ? "border-primary/30 bg-primary/10" : "border-primary/25 bg-primary/5",
            surfaces.subtitle
          )}
        >
          Modo desenvolvimento: voce pode simular conexao e envio de teste abaixo.
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className={card}>
            <div className={cn("flex items-center gap-3 p-4 border-b", headBorder)}>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-base">chat</span>
              </div>
              <div className="min-w-0">
                <h2 className={cn("text-sm font-bold", surfaces.title)}>Numero WhatsApp</h2>
                <p className={cn("text-xs mt-0.5", surfaces.muted)}>Um numero por empresa</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-2.5 rounded-full shrink-0",
                    sessionStatus === "connected"
                      ? "bg-emerald-500"
                      : sessionStatus === "connecting"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-gray-400"
                  )}
                />
                <span className={cn("text-sm font-medium", surfaces.title)}>
                  {sessionStatus === "connected" && sessionPhone
                    ? `Conectado · +${sessionPhone}`
                    : isComingSoon
                      ? "Disponivel em breve"
                      : sessionStatus === "connecting"
                        ? "Conectando..."
                        : "Desconectado"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sessionBusy || isComingSoon}
                  onClick={() => void sessionAction("connect")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold transition-opacity",
                    isComingSoon ? surfaces.btnSecondary : "bg-primary text-black hover:opacity-90"
                  )}
                >
                  {sessionBusy ? "Aguarde..." : isComingSoon ? "Em breve" : "Conectar"}
                </button>
                {!isComingSoon && sessionStatus === "connected" ? (
                  <button
                    type="button"
                    disabled={sessionBusy}
                    onClick={() => void sessionAction("disconnect")}
                    className={cn(surfaces.btnSecondary, "px-4 py-2 rounded-xl text-xs font-semibold border")}
                  >
                    Desconectar
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className={card}>
            <div className={cn("flex items-center gap-3 p-4 border-b", headBorder)}>
              <div className="size-9 rounded-lg bg-blue-400/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-400 text-base">tune</span>
              </div>
              <div>
                <h2 className={cn("text-sm font-bold", surfaces.title)}>Preferencias gerais</h2>
                <p className={cn("text-xs mt-0.5", surfaces.muted)}>Envio automatico e alertas internos</p>
              </div>
            </div>
            <div className={cn(isDark ? "divide-y divide-white/[0.06]" : "divide-y divide-gray-200")}>
              {[
                {
                  key: "masterEnabled" as const,
                  label: "Mensagens automaticas",
                  desc: "Enfileira envios conforme os templates ativos",
                  icon: "send",
                },
                {
                  key: "notifyOwnerOnNewBooking" as const,
                  label: "Novos agendamentos",
                  desc: "Alerta para voce (WhatsApp conectado ou numero abaixo)",
                  icon: "event_available",
                },
                {
                  key: "notifyOwnerOnCancellation" as const,
                  label: "Cancelamentos",
                  desc: "Alerta para voce (WhatsApp conectado ou numero abaixo)",
                  icon: "event_busy",
                },
                {
                  key: "notifyStaffOnNewBooking" as const,
                  label: "Novos horarios (equipe)",
                  desc: "Telefone do colaborador em Equipe",
                  icon: "groups",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("material-symbols-outlined text-base shrink-0", surfaces.muted)}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium", surfaces.title)}>{item.label}</p>
                      <p className={cn("text-xs mt-0.5", surfaces.muted)}>{item.desc}</p>
                    </div>
                  </div>
                  <SwitchToggle
                    checked={settings[item.key]}
                    onChange={() => setSettings((s) => ({ ...s, [item.key]: !s[item.key] }))}
                    trackOffClassName={isDark ? "bg-gray-500" : "bg-gray-300"}
                  />
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-inherit space-y-1.5">
              <label className={cn("block text-xs font-medium", surfaces.muted)}>
                Outro numero para alertas (opcional)
                <input
                  value={settings.ownerNotificationPhone}
                  onChange={(e) => setSettings((s) => ({ ...s, ownerNotificationPhone: e.target.value }))}
                  placeholder="Deixe vazio para usar o WhatsApp conectado"
                  className={cn("mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl border", surfaces.input)}
                />
              </label>
              <p className={cn("text-[11px] leading-relaxed", surfaces.muted)}>{ownerAlertPhoneHint}</p>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-xs space-y-2",
              isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={surfaces.muted}>Templates ativos</span>
              <span className={cn("font-semibold", surfaces.title)}>
                {templates.filter((t) => t.enabled).length} de {templates.length}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={surfaces.muted}>Envio automatico</span>
              <span className={cn("font-semibold", surfaces.title)}>
                {settings.masterEnabled ? "Ligado" : "Desligado"}
              </span>
            </div>
          </div>
        </div>

        <div className={cn(card, "flex flex-col")}>
          <div className={cn("p-4 border-b", headBorder)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="size-9 rounded-lg bg-emerald-400/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-400 text-base">forum</span>
              </div>
              <div>
                <h2 className={cn("text-sm font-bold", surfaces.title)}>Mensagens automaticas</h2>
                <p className={cn("text-xs mt-0.5", surfaces.muted)}>
                  {activeTab === "cliente"
                    ? "Escolha o tipo de mensagem e edite o texto abaixo"
                    : "Ative cada mensagem e edite o texto abaixo"}
                </p>
              </div>
            </div>
            <div className={cn("flex gap-1 p-1 rounded-xl", isDark ? "bg-white/[0.06]" : "bg-gray-100")}>
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "cliente") {
                      selectFirstInTab("cliente", activeClientGroup);
                    } else {
                      selectFirstInTab(tab.id);
                    }
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all min-w-0",
                    activeTab === tab.id
                      ? "bg-primary text-black shadow-sm"
                      : isDark
                        ? "text-white/60 hover:text-white hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white"
                  )}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </div>
            {activeTab === "cliente" ? (
              <div className={cn("flex flex-wrap gap-1.5 mt-3", surfaces.muted)}>
                {WHATSAPP_CLIENT_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setActiveClientGroup(group.id);
                      selectFirstInTab("cliente", group.id);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                      activeClientGroup === group.id
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : isDark
                          ? "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    )}
                  >
                    <span className="material-symbols-outlined text-sm">{group.icon}</span>
                    {group.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {activeTab === "profissional" ? (
            <div
              className={cn(
                "mx-4 mt-3 mb-3 flex gap-2.5 rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
                isDark ? "border-blue-400/25 bg-blue-400/[0.08]" : "border-blue-200 bg-blue-50"
              )}
            >
              <span className="material-symbols-outlined text-blue-400 text-base shrink-0">info</span>
              <p className={isDark ? "text-gray-200" : "text-gray-800"}>
                Para cada profissional receber alertas no WhatsApp, cadastre o{" "}
                <strong>telefone no perfil do colaborador</strong> em{" "}
                <GuardedDashboardLink href="/dashboard/colaboradores" className="text-primary font-semibold hover:underline">
                  Equipe
                </GuardedDashboardLink>
                . Sem telefone, a mensagem nao e enviada.
              </p>
            </div>
          ) : null}

          <div className={cn(isDark ? "divide-y divide-white/[0.06]" : "divide-y divide-gray-200")}>
            {tabEvents.map((ev) => {
              const key = templateKey(ev.key, ev.recipientRole);
              const tpl = templates.find((t) => t.eventKey === ev.key && t.recipientRole === ev.recipientRole);
              const selected = activeEventKey === key;
              const timing = tpl
                ? scheduleLabel(tpl.scheduleKind, tpl.scheduleOffsetMinutes)
                : scheduleLabel(ev.scheduleKind, ev.scheduleOffsetMinutes);

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveEventKey(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveEventKey(key);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    selected
                      ? isDark
                        ? "bg-primary/10"
                        : "bg-primary/5"
                      : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        tpl?.enabled ? "bg-emerald-500" : isDark ? "bg-gray-600" : "bg-gray-300"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <p className={cn("text-sm font-medium", surfaces.title)}>{ev.label}</p>
                      {timing ? (
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            isDark ? "bg-white/10 text-white/70" : "bg-gray-200 text-gray-600"
                          )}
                        >
                          {timing}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <SwitchToggle
                      checked={Boolean(tpl?.enabled)}
                      onChange={() => setTemplateEnabled(ev, !tpl?.enabled)}
                      trackOffClassName={isDark ? "bg-gray-600" : "bg-gray-300"}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {activeTemplate && activeDefinition ? (
            <div className={cn("p-4 border-t", headBorder)}>
              <div className="mb-4">
                <h3 className={cn("text-sm font-bold", surfaces.title)}>{activeDefinition.label}</h3>
                <p className={cn("text-xs mt-0.5", surfaces.muted)}>{activeDefinition.description}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={cn("text-xs font-medium mb-1.5 block", surfaces.muted)}>Texto da mensagem</label>
                  <textarea
                    value={activeTemplate.body}
                    onChange={(e) => updateTemplateBody(e.target.value)}
                    rows={8}
                    className={cn(
                      "w-full px-3 py-2.5 text-sm rounded-xl border font-mono leading-relaxed resize-none",
                      surfaces.input
                    )}
                  />
                  <div className="mt-2">
                    <p className={cn("text-[11px] mb-1.5", surfaces.muted)}>Inserir variavel:</p>
                    <div className="flex flex-wrap gap-1">
                      {WHATSAPP_TEMPLATE_VARIABLES.slice(0, 8).map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => updateTemplateBody(`${activeTemplate.body}{${v.key}}`)}
                          className={cn(
                            surfaces.btnSecondary,
                            "px-2 py-0.5 rounded-md text-[10px] font-mono border hover:border-primary/40"
                          )}
                        >
                          {`{${v.key}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className={cn("text-xs font-medium mb-1.5", surfaces.muted)}>Previa</p>
                  <div
                    className={cn(
                      "rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed border min-h-[120px]",
                      isDark
                        ? "bg-[#0b141a] border-white/10 text-[#e9edef]"
                        : "bg-[#ece5dd] border-gray-200 text-gray-900"
                    )}
                  >
                    {previewText}
                  </div>
                  {isDev ? (
                    <button
                      type="button"
                      onClick={() => void simulateSend()}
                      className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Simular envio
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={!isDirty || saving}
        onClick={() => void saveAll()}
        className="w-full mt-8 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-base">save</span>
        {saving ? "Salvando..." : "Salvar configuracoes"}
      </button>
    </div>
  );
}
