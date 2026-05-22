/** Tipos de conta alinhados ao enum `public.user_account_kind` no Supabase. */

export const USER_ACCOUNT_KINDS = [
  "platform_admin",
  "business_owner",
  "business_staff",
  "client",
] as const;

export type UserAccountKind = (typeof USER_ACCOUNT_KINDS)[number];

export const SIGNUP_CHANNELS = ["owner", "staff", "client", "admin", "unknown"] as const;

export type SignupChannel = (typeof SIGNUP_CHANNELS)[number];

/** Valor gravado em `auth.users.raw_user_meta_data.signup_channel` no OAuth. */
export function signupChannelFromLoginContext(
  context: "cliente" | "staff" | "owner" | null | undefined
): SignupChannel {
  if (context === "cliente") return "client";
  if (context === "staff") return "staff";
  if (context === "owner") return "owner";
  return "owner";
}

/** Metadados OAuth gravados em `auth.users` (trigger `handle_new_user`). */
export function oauthUserMetadata(context: "cliente" | "staff" | "owner" | null | undefined) {
  return { signup_channel: signupChannelFromLoginContext(context) };
}

export function accountKindLabel(kind: UserAccountKind): string {
  switch (kind) {
    case "platform_admin":
      return "Administrador";
    case "business_owner":
      return "Dono do negócio";
    case "business_staff":
      return "Funcionário";
    case "client":
      return "Cliente";
    default:
      return kind;
  }
}

export function loginAreaForKind(kind: UserAccountKind): "/dashboard" | "/conta" | "/dashboard/minhas-comissoes" {
  if (kind === "client") return "/conta";
  if (kind === "business_staff") return "/dashboard/minhas-comissoes";
  return "/dashboard";
}
