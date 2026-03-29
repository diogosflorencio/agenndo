/** Telefone BR no input: até 11 dígitos, máscara (XX) XXXXX-XXXX / (XX) XXXX-XXXX. */

const MAX_DIGITS = 11;

export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

/** Formata string que pode conter lixo; usa só os dígitos iniciais. */
export function formatBrazilPhoneFromDigits(digitsOrRaw: string): string {
  const d = phoneDigitsOnly(digitsOrRaw);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Valor a exibir após digitar/colar no input. */
export function maskPhoneInputRaw(raw: string): string {
  return formatBrazilPhoneFromDigits(phoneDigitsOnly(raw));
}
