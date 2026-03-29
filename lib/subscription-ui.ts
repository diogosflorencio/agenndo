/** Rótulos para UI a partir de subscription_status (Stripe) ou ausência de assinatura */

export function describeSubscriptionStatus(
  plan: string,
  subscriptionStatus: string | null | undefined
): { badge: string; detail: string; isPaidActive: boolean } {
  if (!subscriptionStatus) {
    if (plan === "free") {
      return {
        badge: "Grátis",
        detail: "Plano gratuito com trial de 7 dias ao criar o negócio.",
        isPaidActive: false,
      };
    }
    return {
      badge: "Pendente",
      detail: "Conclua a assinatura no Stripe para ativar o acesso pago.",
      isPaidActive: false,
    };
  }

  switch (subscriptionStatus) {
    case "trialing":
      return {
        badge: "Trial",
        detail: "Período de teste ativo. A cobrança inicia após o fim do trial.",
        isPaidActive: true,
      };
    case "active":
      return {
        badge: "Ativo",
        detail: "Assinatura em dia.",
        isPaidActive: true,
      };
    case "past_due":
      return {
        badge: "Pagamento pendente",
        detail: "Atualize o método de pagamento no portal da Stripe.",
        isPaidActive: false,
      };
    case "canceled":
    case "unpaid":
      return {
        badge: "Encerrado",
        detail: "Assinatura cancelada ou inadimplente.",
        isPaidActive: false,
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        badge: "Incompleto",
        detail: "Finalize o checkout ou tente assinar novamente.",
        isPaidActive: false,
      };
    case "paused":
      return {
        badge: "Pausado",
        detail: "Cobrança pausada.",
        isPaidActive: false,
      };
    default:
      return {
        badge: subscriptionStatus,
        detail: "",
        isPaidActive: false,
      };
  }
}

export function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
