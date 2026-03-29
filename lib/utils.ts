import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Hex (#RGB ou #RRGGBB) → `rgba(r,g,b,a)` para sombras e overlays com a cor do negócio. */
export function rgbaFromHex(hex: string, alpha: number): string {
  const t = hex.trim();
  const fallback = `rgba(19, 236, 91, ${alpha})`;
  if (!t.startsWith("#")) return fallback;
  let r: number;
  let g: number;
  let b: number;
  if (t.length === 7) {
    r = parseInt(t.slice(1, 3), 16);
    g = parseInt(t.slice(3, 5), 16);
    b = parseInt(t.slice(5, 7), 16);
  } else if (t.length === 4) {
    r = parseInt(t[1] + t[1], 16);
    g = parseInt(t[2] + t[2], 16);
    b = parseInt(t[3] + t[3], 16);
  } else {
    return fallback;
  }
  if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Retorna URL do WhatsApp (wa.me) ou null se não houver dígitos. Prefixa 55 quando o número for só DDD+número (Brasil). */
export { formatBrazilPhoneFromDigits, maskPhoneInputRaw, phoneDigitsOnly } from "./phone-mask";

export function phoneToWhatsAppHref(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").replace(/\D/g, "");
  if (!raw) return null;
  const digits = raw.startsWith("55") && raw.length >= 12 ? raw : `55${raw}`;
  return `https://wa.me/${digits}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const STATUS_CONFIG = {
  agendado: { label: "Agendado", color: "text-blue-400", bg: "bg-blue-400/10", dot: "bg-blue-400" },
  confirmado: { label: "Confirmado", color: "text-green-400", bg: "bg-green-400/10", dot: "bg-green-400" },
  compareceu: { label: "Compareceu", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary" },
  faltou: { label: "Faltou", color: "text-red-400", bg: "bg-red-400/10", dot: "bg-red-400" },
  cancelado: { label: "Cancelado", color: "text-gray-500", bg: "bg-gray-500/10", dot: "bg-gray-500" },
  remarcado: { label: "Remarcado", color: "text-yellow-400", bg: "bg-yellow-400/10", dot: "bg-yellow-400" },
} as const;

export type AppointmentStatus = keyof typeof STATUS_CONFIG;
