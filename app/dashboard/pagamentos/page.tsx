"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";
import { useRegisterDashboardUnsavedNavigation } from "@/lib/dashboard-navigation-guard";
import { MercadoPagoLogo } from "@/components/ui/icons/MercadoPagoLogo";
import {
  DEFAULT_PAYMENT_CLIENT_MESSAGE,
  DEPOSIT_NO_SHOW_NOTE,
  PAYMENT_POLICY_LABELS,
  type PaymentPolicy,
} from "@/lib/business-payment-policy";
import { DEFAULT_PUBLIC_PIX_SUGGEST_MESSAGE } from "@/lib/public-pix";
import { mercadoPagoOAuthErrorMessage } from "@/lib/mercadopago/oauth-messages";
import { useAppAlert } from "@/components/app-alert-provider";

type PaymentForm = {
  publicPixKey: string;
  publicPixSuggestEnabled: boolean;
  publicPixSuggestMessage: string;
  paymentPolicy: PaymentPolicy;
  depositMode: "percent" | "fixed";
  depositPercent: string;
  depositFixedReais: string;
  paymentClientMessage: string;
  mpCheckoutEnabled: boolean;
};

function formFromRow(data: Record<string, unknown>): PaymentForm {
  return {
    publicPixKey: typeof data.public_pix_key === "string" ? data.public_pix_key.trim() : "",
    publicPixSuggestEnabled: Boolean(data.public_pix_suggest_enabled),
    publicPixSuggestMessage:
      typeof data.public_pix_suggest_message === "string" ? data.public_pix_suggest_message.trim() : "",
    paymentPolicy: (data.payment_policy as PaymentPolicy) ?? "off",
    depositMode: data.deposit_mode === "fixed" ? "fixed" : "percent",
    depositPercent: String(data.deposit_percent ?? 30),
    depositFixedReais:
      data.deposit_fixed_cents != null
        ? String((Number(data.deposit_fixed_cents) / 100).toFixed(2)).replace(".", ",")
        : "",
    paymentClientMessage:
      typeof data.payment_client_message === "string" ? data.payment_client_message.trim() : "",
    mpCheckoutEnabled: Boolean(data.mp_checkout_enabled),
  };
}

export default function PagamentosPage() {
  const { business } = useDashboard();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAppAlert();

  const [mpConnected, setMpConnected] = useState(false);
  const [mpHint, setMpHint] = useState<string | null>(null);
  const [mpRedirectUri, setMpRedirectUri] = useState<string | null>(null);
  const [mpRedirectInsecure, setMpRedirectInsecure] = useState(false);
  const [mpBusy, setMpBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>({
    publicPixKey: "",
    publicPixSuggestEnabled: false,
    publicPixSuggestMessage: "",
    paymentPolicy: "off",
    depositMode: "percent",
    depositPercent: "30",
    depositFixedReais: "",
    paymentClientMessage: "",
    mpCheckoutEnabled: false,
  });

  const loadBusiness = useCallback(async () => {
    if (!business?.id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("businesses")
      .select(
        "mp_user_id, mp_token_hint, mp_connected_at, public_pix_key, public_pix_suggest_enabled, public_pix_suggest_message, payment_policy, deposit_mode, deposit_percent, deposit_fixed_cents, payment_client_message, mp_checkout_enabled"
      )
      .eq("id", business.id)
      .maybeSingle();
    if (!data) return;
    setMpConnected(Boolean(data.mp_user_id && data.mp_connected_at));
    setMpHint(data.mp_token_hint ?? null);
    const next = formFromRow(data as Record<string, unknown>);
    setForm(next);
    setSavedBaseline(JSON.stringify(next));
  }, [business?.id]);

  useEffect(() => {
    void loadBusiness();
  }, [loadBusiness]);

  useEffect(() => {
    void fetch("/api/mercadopago/oauth/meta", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { redirect_uri?: string; redirect_uri_insecure?: boolean }) => {
        if (typeof j.redirect_uri === "string") setMpRedirectUri(j.redirect_uri);
        setMpRedirectInsecure(Boolean(j.redirect_uri_insecure));
      })
      .catch(() => {});
  }, []);

  const isDirty = useMemo(() => {
    if (!business?.id || savedBaseline === null) return false;
    return JSON.stringify(form) !== savedBaseline;
  }, [business?.id, form, savedBaseline]);

  const oauthHandled = useRef(false);
  useEffect(() => {
    if (oauthHandled.current) return;
    const mpError = searchParams.get("mp_error");
    const mpConnectedParam = searchParams.get("mp_connected");
    if (!mpError && mpConnectedParam !== "1") return;
    oauthHandled.current = true;

    if (mpConnectedParam === "1") {
      showAlert("Conta Mercado Pago conectada. Revise as regras de cobrança e salve.", {
        title: "Mercado Pago",
      });
      void loadBusiness();
    } else if (mpError) {
      const detail = searchParams.get("mp_error_detail");
      showAlert(detail ?? mercadoPagoOAuthErrorMessage(mpError), { title: "Mercado Pago" });
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("mp_error");
    next.delete("mp_connected");
    next.delete("mp_error_detail");
    const q = next.toString();
    router.replace(q ? `/dashboard/pagamentos?${q}` : "/dashboard/pagamentos");
  }, [searchParams, router, showAlert, loadBusiness]);

  const connectMp = async () => {
    setMpBusy(true);
    try {
      const res = await fetch(
        `/api/mercadopago/oauth/start?returnTo=${encodeURIComponent("/dashboard/pagamentos")}`,
        { credentials: "include" }
      );
      const j = (await res.json()) as {
        authorize_url?: string;
        redirect_uri?: string;
        redirect_uri_insecure?: boolean;
        error?: string;
      };
      if (typeof j.redirect_uri === "string") setMpRedirectUri(j.redirect_uri);
      if (j.redirect_uri_insecure) setMpRedirectInsecure(true);
      if (!res.ok || !j.authorize_url) throw new Error(j.error ?? "Falha ao iniciar conexão.");
      window.location.href = j.authorize_url;
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro ao conectar.", { title: "Mercado Pago" });
      setMpBusy(false);
    }
  };

  const disconnectMp = async () => {
    setMpBusy(true);
    try {
      const res = await fetch("/api/mercadopago/oauth/disconnect", { method: "POST" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Falha ao desconectar.");
      showAlert("Mercado Pago desconectado. Cobrança online foi desativada.", { title: "Mercado Pago" });
      void loadBusiness();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro.", { title: "Mercado Pago" });
    } finally {
      setMpBusy(false);
    }
  };

  const saveSettings = useCallback(async (): Promise<boolean> => {
    if (!business?.id) return false;
    setSaving(true);
    try {
      const supabase = createClient();
      const keyTrim = form.publicPixKey.trim();
      const suggestOn = Boolean(form.publicPixSuggestEnabled && keyTrim.length > 0);
      const fixedCents = form.depositFixedReais
        ? Math.round(parseFloat(form.depositFixedReais.replace(",", ".")) * 100)
        : null;

      const mpCheckoutOn =
        mpConnected && form.paymentPolicy !== "off"
          ? true
          : form.mpCheckoutEnabled;

      const { error } = await supabase
        .from("businesses")
        .update({
          public_pix_key: keyTrim || null,
          public_pix_suggest_enabled: suggestOn,
          public_pix_suggest_message: suggestOn ? form.publicPixSuggestMessage.trim() || null : null,
          payment_policy: form.paymentPolicy,
          deposit_mode: form.depositMode,
          deposit_percent: form.depositMode === "percent" ? Number(form.depositPercent) || 30 : null,
          deposit_fixed_cents: form.depositMode === "fixed" ? fixedCents : null,
          payment_client_message: form.paymentClientMessage.trim() || null,
          mp_checkout_enabled: mpCheckoutOn,
        })
        .eq("id", business.id);

      if (error) throw new Error(error.message);
      setSavedBaseline(JSON.stringify(form));
      showAlert("Configurações de recebimento salvas.", { title: "Receber pagamentos" });
      return true;
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Não foi possível salvar.", { title: "Erro" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [business?.id, form, showAlert, mpConnected]);

  useRegisterDashboardUnsavedNavigation(isDirty, saveSettings, !!business?.id);

  const policyRequiresMp =
    form.paymentPolicy === "required_deposit" || form.paymentPolicy === "required_full";
  const pixActive = Boolean(form.publicPixSuggestEnabled && form.publicPixKey.trim());
  const mpActive = Boolean(mpConnected && form.mpCheckoutEnabled);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className={cn("text-2xl font-bold", surfaces.title)}>Receber pagamentos</h1>
          <UnsavedChangesIndicator dirty={isDirty} variant="inline" />
        </div>
        <p className={cn("text-sm mt-1 leading-relaxed", surfaces.subtitle)}>
          Escolha como o cliente pode pagar na confirmação do agendamento: orientação com Pix manual ou cobrança
          verificada com sua conta Mercado Pago (Pix, cartão e outros meios).
        </p>
      </div>

      <div
        className={cn(
          "mb-4 rounded-xl border px-4 py-3 text-xs leading-relaxed grid sm:grid-cols-2 gap-3",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"
        )}
      >
        <div>
          <p className={cn("font-semibold mb-0.5", surfaces.title)}>Pix manual</p>
          <p className={surfaces.muted}>
            {pixActive ? "Ativo - chave visível na página; você confere o comprovante." : "Desativado"}
          </p>
        </div>
        <div>
          <p className={cn("font-semibold mb-0.5", surfaces.title)}>Mercado Pago</p>
          <p className={surfaces.muted}>
            {mpActive
              ? `Ativo - ${PAYMENT_POLICY_LABELS[form.paymentPolicy].toLowerCase()}`
              : mpConnected
                ? "Conectado, cobrança online desligada"
                : "Não conectado"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 items-stretch">
      {/* Pix manual */}
      <section className={cn(surfaces.panel, "p-5 space-y-4 h-full flex flex-col")}>
        <div className="flex items-start gap-3">
          <span className={cn("material-symbols-outlined text-2xl shrink-0", isDark ? "text-emerald-400" : "text-emerald-600")}>
            qr_code_2
          </span>
          <div>
            <h2 className={cn("text-base font-bold", surfaces.title)}>Pix manual (opcional)</h2>
            <p className={cn("text-xs mt-1 leading-relaxed", surfaces.subtitle)}>
              Mostra sua chave Pix e uma mensagem na etapa de confirmação. O cliente copia e paga por fora (ex.:
              comprovante no WhatsApp). <strong className={surfaces.title}>Não confirma</strong> pagamento
              automaticamente.
            </p>
          </div>
        </div>

        <div>
          <label className={cn("text-sm font-medium block mb-1.5", surfaces.label)}>Chave Pix</label>
          <input
            type="text"
            value={form.publicPixKey}
            onChange={(e) => {
              const v = e.target.value;
              setForm((prev) => ({
                ...prev,
                publicPixKey: v,
                publicPixSuggestEnabled: v.trim() ? prev.publicPixSuggestEnabled : false,
              }));
            }}
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            autoComplete="off"
            className={cn("w-full h-11 rounded-xl px-4 text-sm", surfaces.input)}
          />
        </div>

        <label className={cn("flex items-start gap-3 cursor-pointer", surfaces.subtitle)}>
          <input
            type="checkbox"
            className="mt-1 rounded"
            checked={form.publicPixSuggestEnabled}
            disabled={!form.publicPixKey.trim()}
            onChange={(e) => setForm((f) => ({ ...f, publicPixSuggestEnabled: e.target.checked }))}
          />
          <span>
            <span className={cn("font-semibold block text-sm", surfaces.title)}>
              Exibir Pix na confirmação do agendamento
            </span>
            <span className="text-xs">Requer chave preenchida acima.</span>
          </span>
        </label>

        <div>
          <label className={cn("text-sm font-medium block mb-1.5", surfaces.label)}>Mensagem ao cliente (Pix)</label>
          <textarea
            rows={2}
            value={form.publicPixSuggestMessage}
            onChange={(e) => setForm((f) => ({ ...f, publicPixSuggestMessage: e.target.value }))}
            placeholder={DEFAULT_PUBLIC_PIX_SUGGEST_MESSAGE}
            disabled={!form.publicPixKey.trim()}
            className={cn("w-full rounded-xl px-4 py-3 text-sm resize-none", surfaces.input)}
          />
        </div>
      </section>

      {/* Mercado Pago */}
      <section className={cn(surfaces.panel, "p-5 space-y-5 h-full flex flex-col")}>
        <div className="flex items-start gap-3">
          <MercadoPagoLogo className="h-8 w-10 shrink-0" />
          <div>
            <h2 className={cn("text-base font-bold", surfaces.title)}>Mercado Pago (cobrança verificada)</h2>
            <p className={cn("text-xs mt-1 leading-relaxed", surfaces.subtitle)}>
              Conecte <strong className={surfaces.title}>sua</strong> conta. O cliente paga na própria página (Pix,
              cartão, etc.). O sistema confirma via webhook - ideal para sinal obrigatório ou pagamento integral
              antecipado.
            </p>
            <p className={cn("text-xs mt-2", mpConnected ? "text-primary font-medium" : surfaces.muted)}>
              {mpConnected ? `Conta conectada${mpHint ? ` · …${mpHint}` : ""}` : "Não conectada"}
            </p>
          </div>
        </div>

        {mpRedirectInsecure || (mpRedirectUri && typeof window !== "undefined" && window.location.hostname === "localhost") ? (
          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed",
              isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-950"
            )}
          >
            <p className="font-semibold mb-1">
              {mpRedirectInsecure ? "Redirect precisa ser HTTPS" : "OAuth fora do localhost"}
            </p>
            {mpRedirectInsecure ? (
              <p>
                O Mercado Pago <strong>não aceita</strong> <code className="text-[10px]">http://</code>. Ajuste{" "}
                <code className="text-[10px]">MERCADOPAGO_REDIRECT_URI</code> para uma URL HTTPS cadastrada no app MP.
              </p>
            ) : (
              <p>
                Em <code className="text-[10px]">localhost</code> o OAuth não funciona com redirect HTTP. Use uma destas
                opções:
              </p>
            )}
            <ul className="mt-1.5 list-disc pl-4 space-y-1 opacity-90">
              <li>
                Conectar em{" "}
                <a href="https://www.agenndo.com.br/dashboard/pagamentos" className="underline font-medium">
                  www.agenndo.com.br
                </a>{" "}
                (recomendado) - <code className="text-[10px]">MERCADOPAGO_REDIRECT_URI</code> = URL de produção.
              </li>
              <li>
                Túnel HTTPS (ngrok): cadastre{" "}
                <code className="text-[10px]">https://SEU-TUNEL/api/mercadopago/oauth/callback</code> no painel MP e no
                .env.
              </li>
            </ul>
            {mpRedirectUri ? (
              <p className="mt-1.5 opacity-80">
                Valor atual no servidor: <code className="text-[10px] break-all">{mpRedirectUri}</code>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!mpConnected ? (
            <button
              type="button"
              disabled={mpBusy || mpRedirectInsecure}
              onClick={() => void connectMp()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-brand-accent text-sm font-bold hover:bg-primary/90 disabled:opacity-60"
            >
              Conectar minha conta Mercado Pago
              <span className="material-symbols-outlined text-base">open_in_new</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={mpBusy}
              onClick={() => void disconnectMp()}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold",
                isDark ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-red-300 text-red-700"
              )}
            >
              Desconectar conta
            </button>
          )}
        </div>

        <div className={cn("space-y-4 pt-2 border-t", isDark ? "border-white/10" : "border-gray-200")}>
          <label className={cn("flex items-start gap-3", !mpConnected ? "opacity-50" : "")}>
            <input
              type="checkbox"
              className="mt-1 rounded"
              checked={form.mpCheckoutEnabled}
              disabled={!mpConnected}
              onChange={(e) => setForm((f) => ({ ...f, mpCheckoutEnabled: e.target.checked }))}
            />
            <span>
              <span className={cn("font-semibold block text-sm", surfaces.title)}>Ativar cobrança online</span>
              <span className={cn("text-xs", surfaces.muted)}>
                Usa o formulário seguro do Mercado Pago na confirmação do agendamento.
              </span>
            </span>
          </label>

          <div className={!mpConnected || !form.mpCheckoutEnabled ? "opacity-50 pointer-events-none" : ""}>
            <label className={cn("text-sm font-medium block mb-1.5", surfaces.label)}>Política de cobrança</label>
            <select
              value={form.paymentPolicy}
              disabled={!mpConnected || !form.mpCheckoutEnabled}
              onChange={(e) => setForm((f) => ({ ...f, paymentPolicy: e.target.value as PaymentPolicy }))}
              className={cn("w-full h-11 rounded-xl px-3 text-sm", surfaces.input)}
            >
              {(Object.keys(PAYMENT_POLICY_LABELS) as PaymentPolicy[]).map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_POLICY_LABELS[k]}
                </option>
              ))}
            </select>
            <p className={cn("text-[11px] mt-1.5", surfaces.muted)}>
              Desativado = só Pix manual (se ativo). Opcional = cliente pode pagar online, mas não é obrigatório.
              Obrigatório = precisa pagar (sinal ou total) para confirmar o agendamento.
            </p>
          </div>

          {form.paymentPolicy === "required_deposit" && form.mpCheckoutEnabled ? (
            <div className="space-y-3 pl-1 border-l-2 border-primary/40">
              <p className={cn("text-xs font-semibold", surfaces.title)}>Valor do sinal</p>
              <div className="flex flex-wrap gap-4">
                <label className={cn("text-sm flex items-center gap-2", surfaces.title)}>
                  <input
                    type="radio"
                    checked={form.depositMode === "percent"}
                    disabled={!mpConnected}
                    onChange={() => setForm((f) => ({ ...f, depositMode: "percent" }))}
                  />
                  Percentual do serviço
                </label>
                <label className={cn("text-sm flex items-center gap-2", surfaces.title)}>
                  <input
                    type="radio"
                    checked={form.depositMode === "fixed"}
                    disabled={!mpConnected}
                    onChange={() => setForm((f) => ({ ...f, depositMode: "fixed" }))}
                  />
                  Valor fixo (R$)
                </label>
              </div>
              {form.depositMode === "percent" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.depositPercent}
                    disabled={!mpConnected}
                    onChange={(e) => setForm((f) => ({ ...f, depositPercent: e.target.value }))}
                    className={cn("w-20 h-10 rounded-xl px-3 text-sm", surfaces.input)}
                  />
                  <span className={cn("text-sm", surfaces.muted)}>% do valor do serviço</span>
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="50,00"
                  value={form.depositFixedReais}
                  disabled={!mpConnected}
                  onChange={(e) => setForm((f) => ({ ...f, depositFixedReais: e.target.value }))}
                  className={cn("w-32 h-10 rounded-xl px-3 text-sm", surfaces.input)}
                />
              )}
              <p className={cn("text-xs leading-relaxed", surfaces.muted)}>{DEPOSIT_NO_SHOW_NOTE}</p>
            </div>
          ) : null}

          <div className={!mpConnected || !form.mpCheckoutEnabled ? "opacity-50" : ""}>
            <label className={cn("text-sm font-medium block mb-1.5", surfaces.label)}>
              Mensagem ao cliente (Mercado Pago)
            </label>
            <textarea
              rows={2}
              value={form.paymentClientMessage}
              disabled={!mpConnected || !form.mpCheckoutEnabled}
              onChange={(e) => setForm((f) => ({ ...f, paymentClientMessage: e.target.value }))}
              placeholder={DEFAULT_PAYMENT_CLIENT_MESSAGE}
              className={cn("w-full rounded-xl px-4 py-3 text-sm resize-none", surfaces.input)}
            />
          </div>

          {policyRequiresMp && !mpConnected ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Conecte o Mercado Pago para usar sinal ou pagamento integral obrigatório.
            </p>
          ) : null}
        </div>
      </section>
      </div>

      <button
        type="button"
        disabled={saving || !isDirty}
        onClick={() => void saveSettings()}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-sm transition-all",
          isDirty
            ? "bg-primary text-on-brand-accent hover:bg-primary/90"
            : isDark
              ? "bg-white/10 text-gray-500 cursor-not-allowed"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
        )}
      >
        <span className="material-symbols-outlined text-base">save</span>
        {saving ? "Salvando…" : "Salvar recebimentos"}
      </button>
    </div>
  );
}
