/**
 * CPF/CNPJ para nota fiscal; nome e endereço ficam no Stripe (checkout/portal).
 */

export type BillingFiscalFields = {
  billing_document?: string | null;
};

export function onlyDigits(s: string): string {
  return String(s).replace(/\D/g, "");
}

function isValidCpfDigits(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]!, 10) * (10 - i);
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (d1 !== parseInt(cpf[9]!, 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]!, 10) * (11 - i);
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return d2 === parseInt(cpf[10]!, 10);
}

function isValidCnpjDigits(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let len = cnpj.length - 2;
  const nums = cnpj.substring(0, len);
  const digs = cnpj.substring(len);
  let sum = 0;
  let pos = len - 7;
  for (let i = len; i >= 1; i--) {
    sum += parseInt(nums.charAt(len - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let res = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (res !== parseInt(digs.charAt(0), 10)) return false;
  len += 1;
  const nums2 = cnpj.substring(0, len);
  sum = 0;
  pos = len - 7;
  for (let i = len; i >= 1; i--) {
    sum += parseInt(nums2.charAt(len - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  res = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return res === parseInt(digs.charAt(1), 10);
}

/** CPF (11) ou CNPJ (14) com dígitos verificadores válidos. */
export function isValidBrazilianTaxId(digits: string): boolean {
  if (digits.length === 11) return isValidCpfDigits(digits);
  if (digits.length === 14) return isValidCnpjDigits(digits);
  return false;
}

export function hasBillingDocument(b: BillingFiscalFields | null | undefined): boolean {
  const doc = onlyDigits(b?.billing_document ?? "");
  return doc.length > 0 && isValidBrazilianTaxId(doc);
}

export function normalizeDocumentPayload(
  raw: Record<string, unknown>
): { ok: true; billing_document: string } | { ok: false; error: string } {
  const doc = onlyDigits(typeof raw.billing_document === "string" ? raw.billing_document : "");
  if (!isValidBrazilianTaxId(doc)) {
    return { ok: false, error: "Informe um CPF ou CNPJ válido (somente números)." };
  }
  return { ok: true, billing_document: doc };
}
