"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { SwitchToggle } from "@/components/switch-toggle";
import { EntityPhotoControl } from "@/components/dashboard/entity-photo-control";
import { formatBrazilPhoneFromDigits, getAuthHeaders, maskPhoneInputRaw, phoneDigitsOnly } from "@/lib/utils";
import { HotkeyHint, useRegisterDashboardHotkeys } from "@/lib/dashboard-hotkeys";
import { getSiteUrl } from "@/lib/site-url";
import { useAppAlert } from "@/components/app-alert-provider";

function inviteEmailStorageKey(collaboratorId: string) {
  return `agenndo-collab-invite-email:${collaboratorId}`;
}

const COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#EF4444", "#14B8A6", "#6366F1", "#13EC5B",
];

type Row = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  color: string | null;
  avatar_url: string | null;
  active: boolean;
  auth_user_id: string | null;
};

export default function EditarColaboradorPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { business } = useDashboard();
  const { showAlert } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    color: "#3B82F6",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkedUser, setLinkedUser] = useState(false);
  /** E-mail usado no vínculo (persistido no navegador para a mensagem copiável após recarregar). */
  const [storedInviteEmail, setStoredInviteEmail] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id || !business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from("collaborators")
      .select("id, name, role, phone, color, avatar_url, active, auth_user_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();

    setLoading(false);
    if (qErr || !data) {
      setNotFound(true);
      return;
    }
    const row = data as Row;
    setForm({
      name: row.name,
      role: row.role ?? "",
      phone: formatBrazilPhoneFromDigits(row.phone ?? ""),
      color: row.color ?? "#3B82F6",
      active: row.active,
    });
    setAvatarUrl(row.avatar_url ?? null);
    const linked = !!row.auth_user_id;
    setLinkedUser(linked);
    if (linked && typeof window !== "undefined") {
      setStoredInviteEmail(sessionStorage.getItem(inviteEmailStorageKey(id)));
    } else {
      setStoredInviteEmail(null);
    }
    setNotFound(false);
  }, [id, business?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteMessageText = useMemo(() => {
    const nomeDisplay = form.name.trim() || "profissional(a)";
    const empresa = business?.name?.trim() || "nosso estabelecimento";
    const portalUrl = `${getSiteUrl()}/colaborador`;
    const emailEffective = linkedUser ? (storedInviteEmail?.trim() ?? "") : linkEmail.trim();

    const emailInIntro = emailEffective ? ` com o e-mail ${emailEffective}` : "";

    const emailBlock = emailEffective
      ? `• Confirme no Google o mesmo e-mail: ${emailEffective}`
      : linkedUser
        ? `• E-mail para usar no login com Google: o mesmo que foi cadastrado no vínculo da sua conta na equipe. Se não lembrar qual foi, fale comigo para confirmarmos.`
        : `• E-mail para usar no login com Google: primeiro preencha o campo de e-mail na área acima e copie esta mensagem de novo - precisa ser exatamente o da conta Google que o colaborador usará.`;

    return (
      `Olá, ${nomeDisplay}!\n\n` +
      `Seguem os dados para você acessar o Agenndo (YWP) e acompanhar suas comissões.\n` +
      `Negócio: ${empresa}.\n\n` +
      `${emailBlock}\n` +
      `• Link para começar: ${portalUrl}\n` +
      `• Depois de abrir o link, use "Entrar com Google" com esse mesmo e-mail.\n\n` +
      `Qualquer dúvida, fale comigo.`
    );
  }, [form.name, business?.name, linkEmail, linkedUser, storedInviteEmail]);

  const copyInviteMessage = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessageText);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2800);
    } catch {
      showAlert("Não foi possível copiar. Selecione o texto manualmente ou verifique as permissões do navegador.", {
        title: "Área de transferência",
      });
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !id) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("collaborators")
      .update({
        name: form.name.trim(),
        role: form.role.trim() || null,
        phone: phoneDigitsOnly(form.phone) || null,
        color: form.color,
        active: form.active,
      })
      .eq("id", id);

    setSaving(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    router.push("/dashboard/colaboradores");
  };

  useRegisterDashboardHotkeys(!saving && !!id, "colab-editar", {
    save: () => void handleSave(),
    cancel: () => router.push("/dashboard/colaboradores"),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full text-center py-12">
        <p className="text-gray-600 mb-4">Colaborador não encontrado.</p>
        <Link href="/dashboard/colaboradores" className="text-primary font-semibold hover:underline">
          Voltar para Equipe
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/colaboradores"
          className="size-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar colaborador</h1>
          <p className="text-gray-600 text-sm">{form.name}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        {business?.id ? (
          <div className="flex justify-center mb-6">
            <EntityPhotoControl
              businessId={business.id}
              kind="collaborator"
              entityId={id}
              imageUrl={avatarUrl}
              onPersist={async (url) => {
                const supabase = createClient();
                const { error: pErr } = await supabase.from("collaborators").update({ avatar_url: url }).eq("id", id);
                if (pErr) throw new Error(pErr.message);
                setAvatarUrl(url);
              }}
              accentColor={form.color}
              fallback={
                form.name ? (
                  <span className="text-3xl font-bold" style={{ color: form.color }}>
                    {form.name[0].toUpperCase()}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-gray-500 text-3xl">person</span>
                )
              }
            />
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Nome completo <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: nome do profissional"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Cargo / Função</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Ex.: função ou especialidade"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Telefone (opcional)</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: maskPhoneInputRaw(e.target.value) })}
              placeholder="(11) 99999-9999"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">Cor no calendário</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`size-10 rounded-xl transition-all ${
                    form.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-white scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 py-3 border-t border-gray-200">
            <SwitchToggle checked={form.active} onChange={() => setForm({ ...form, active: !form.active })} />
            <div>
              <p className="text-sm text-gray-900 font-medium">Colaborador ativo</p>
              <p className="text-xs text-gray-500">Aparece na agenda e na página pública de agendamento</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link
          href="/dashboard/colaboradores"
          className="relative flex flex-1 items-center justify-center gap-2 px-3 py-4 pr-3 text-center text-sm font-semibold text-gray-700 transition-all bg-white border border-gray-200 hover:bg-gray-50 rounded-xl lg:pr-[4.75rem]"
        >
          <span className="flex min-w-0 flex-1 justify-center">Cancelar</span>
          <HotkeyHint action="cancel" layout="floating-end" />
        </Link>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!form.name.trim() || saving}
          className="relative flex flex-1 items-center justify-center gap-2 px-3 py-4 pr-3 text-sm font-bold text-black transition-all bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl lg:pr-[4.75rem]"
        >
          <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {saving ? "Salvando…" : "Salvar alterações"}
            {!saving && <span className="material-symbols-outlined shrink-0 text-base">check</span>}
          </span>
          {!saving && <HotkeyHint action="save" variant="primary" layout="floating-end" />}
        </button>
      </div>

      <div className="mt-6">
        <Link
          href={`/dashboard/colaboradores/${id}/servicos`}
          className="flex items-center justify-center gap-2 py-3 w-full bg-white border border-gray-200 hover:border-primary/40 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all"
        >
          <span className="material-symbols-outlined text-base">category</span>
          Gerenciar serviços deste colaborador
        </Link>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
  <h2 className="text-sm font-bold text-gray-900 mb-1">Acesso do profissional</h2>
  <p className="text-xs text-gray-500 mb-5">
    Vincule a conta do profissional para que ele acesse o painel <span className="font-semibold text-gray-700">Minhas comissões</span> e visualize apenas os próprios dados.
  </p>

  {linkedUser ? (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <span className="material-symbols-outlined text-base leading-none">check_circle</span>
        Conta vinculada
      </span>
      <button
        type="button"
        disabled={linkBusy}
        onClick={async () => {
          setLinkBusy(true);
          try {
            const res = await fetch(`/api/dashboard/collaborator-link?collaboratorId=${encodeURIComponent(id)}`, {
              method: "DELETE",
              credentials: "include",
              headers: { ...getAuthHeaders() },
            });
            const j = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(j.error ?? "Erro");
            setLinkedUser(false);
            try { sessionStorage.removeItem(inviteEmailStorageKey(id)); } catch { /* ignore */ }
            setStoredInviteEmail(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao desvincular");
          } finally {
            setLinkBusy(false);
          }
        }}
        className="text-sm font-semibold text-red-500 hover:underline disabled:opacity-50"
      >
        Desvincular
      </button>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2 items-end">
      <label className="flex-1 min-w-[12rem] text-xs font-medium text-gray-600">
        E-mail Google do profissional
        <input
          type="email"
          value={linkEmail}
          onChange={(e) => setLinkEmail(e.target.value)}
          placeholder="nome@gmail.com"
          className="mt-1 w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 outline-none focus:border-primary transition-colors"
        />
      </label>
      <button
        type="button"
        disabled={linkBusy || !linkEmail.trim()}
        onClick={async () => {
          setLinkBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/dashboard/collaborator-link", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json", ...getAuthHeaders() },
              body: JSON.stringify({ collaboratorId: id, email: linkEmail.trim() }),
            });
            const j = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(j.error ?? "Erro");
            const em = linkEmail.trim();
            try { sessionStorage.setItem(inviteEmailStorageKey(id), em); } catch { /* ignore */ }
            setStoredInviteEmail(em);
            setLinkedUser(true);
            setLinkEmail("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao vincular");
          } finally {
            setLinkBusy(false);
          }
        }}
        className="h-11 px-5 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50 transition-opacity"
      >
        {linkBusy ? "…" : "Vincular"}
      </button>
    </div>
  )}

  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div>
        <p className="text-xs font-bold text-gray-900">Mensagem pronta para enviar</p>
        <p className="text-[11px] text-gray-500 mt-0.5">Cole no WhatsApp ou e-mail.</p>
      </div>
      <button
        type="button"
        onClick={() => void copyInviteMessage()}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
      >
        <span className="material-symbols-outlined text-base leading-none">content_copy</span>
        {inviteCopied ? "Copiado!" : "Copiar"}
      </button>
    </div>
    <textarea
      readOnly
      value={inviteMessageText}
      rows={10}
      className="w-full resize-y min-h-[10rem] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-800 leading-relaxed font-sans outline-none"
      aria-label="Mensagem para o profissional"
    />
  </div>
</div>
    </div>
  );
}
