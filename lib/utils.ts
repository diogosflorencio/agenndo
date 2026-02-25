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
