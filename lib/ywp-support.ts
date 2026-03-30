/**
 * Identifica e-mail de suporte YWP (ex.: na lista de sessões quando alguém está no seu painel).
 * Configure NEXT_PUBLIC_YWP_SUPPORT_EMAILS com e-mails completos separados por vírgula,
 * ou sufixos de domínio começando por @ (ex.: @yourwebplace.com).
 * Sem variável, usa um fallback de desenvolvimento (ywp.company@gmail.com).
 */
export function isYwpSupportActorEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;

  const rules =
    process.env.NEXT_PUBLIC_YWP_SUPPORT_EMAILS?.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean) ??
    [];

  if (rules.length > 0) {
    for (const rule of rules) {
      if (rule.startsWith("@")) {
        if (e.endsWith(rule)) return true;
      } else if (e === rule) {
        return true;
      }
    }
    return false;
  }

  return e === "ywp.company@gmail.com";
}

/**
 * Acesso compartilhado genérico (ex.: token entre utilizadores — não é necessariamente suporte YWP).
 * Reforça que não é a conta pessoal de quem está a navegar.
 */
export const SHARED_ACCESS_UNRECOGNIZED_MESSAGE =
  "Isto não é a sua conta de prestador: você está a ver o painel de outra pessoa. Se não reconhece ou não autorizou esta sessão, use «Voltar à minha conta», confirme com quem lhe deu o token e, em caso de suspeita, fale com o suporte do Agenndo.";

/** Texto sob cada linha «Alguém está no seu painel» (Painel aberto via token). */
export const YWP_UNRECOGNIZED_ACCESS_MESSAGE =
  "Se não reconhece este acesso como parte do suporte oficial YWP, contacte o suporte YWP de imediato pelos canais oficiais.";

/**
 * Link opcional para contacto (WhatsApp, mailto, página). Usa NEXT_PUBLIC_AGENNDO_SUPPORT_URL
 * ou, em alternativa, NEXT_PUBLIC_YWP_SUPPORT_URL.
 */
export function getSupportContactUrl(): string | null {
  const a = process.env.NEXT_PUBLIC_AGENNDO_SUPPORT_URL?.trim();
  const b = process.env.NEXT_PUBLIC_YWP_SUPPORT_URL?.trim();
  if (a && a.length > 0) return a;
  if (b && b.length > 0) return b;
  return null;
}

/** @deprecated use getSupportContactUrl */
export function getYwpSupportContactUrl(): string | null {
  return getSupportContactUrl();
}
