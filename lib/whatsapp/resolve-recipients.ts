/**
 * Destino dos alertas internos do responsavel.
 * 1) Numero informado nas configuracoes (outro celular)
 * 2) Numero da sessao WhatsApp conectada (mensagem para si / mesmo numero)
 * 3) Telefone do dono no payload do evento (quando o fluxo ja carregou)
 */
export function resolveOwnerAlertPhone(
  settingsPhone: string | null | undefined,
  sessionPhoneE164: string | null | undefined,
  payloadPhone?: string | null
): string | null {
  const fromSettings = settingsPhone?.trim();
  if (fromSettings) return fromSettings;

  const fromSession = sessionPhoneE164?.trim();
  if (fromSession) return fromSession;

  const fromPayload = payloadPhone?.trim();
  if (fromPayload) return fromPayload;

  return null;
}
