import { getStripe } from "@/lib/stripe/server";

/** Envia só CPF/CNPJ ao Customer Stripe (nome e endereço vêm do próprio checkout/portal). */
export async function syncStripeCustomerTaxId(customerId: string, documentDigits: string): Promise<void> {
  const stripe = getStripe();
  const taxType = documentDigits.length === 11 ? "br_cpf" : "br_cnpj";
  const existing = await stripe.customers.listTaxIds(customerId, { limit: 32 });
  for (const t of existing.data) {
    await stripe.customers.deleteTaxId(customerId, t.id);
  }
  await stripe.customers.createTaxId(customerId, {
    type: taxType,
    value: documentDigits,
  });
}
