const MAP: Record<string, string> = {
  invalid_grant:
    "O código de autorização expirou ou já foi usado. Volte ao painel e clique em Conectar novamente (evite atualizar a página do Mercado Pago).",
  invalid_client: "Credenciais do aplicativo Mercado Pago inválidas. Verifique CLIENT_ID e CLIENT_SECRET.",
  redirect_uri_mismatch:
    "A URL de redirect não confere com o app no Mercado Pago. Cadastre exatamente MERCADOPAGO_REDIRECT_URI em Suas integrações → app → URLs de redirecionamento.",
  forbidden:
    "Mercado Pago recusou a autorização (403). Confira se a URL de redirect está cadastrada no app e se PKCE está alinhado com o painel.",
  access_denied: "Autorização cancelada no Mercado Pago.",
};

export function mercadoPagoOAuthErrorMessage(code: string | null | undefined, fallback?: string): string {
  if (!code) return fallback ?? "Não foi possível conectar o Mercado Pago.";
  return MAP[code] ?? fallback ?? `Erro Mercado Pago: ${code}`;
}
