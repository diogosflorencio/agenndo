import type { UserAccountKind } from "@/lib/account-types";
import type { UnifiedRowKind } from "./types";

/** Como classificar uma linha no painel /operacoes. */
export function classifyOperacoesRowKind(input: {
  accountKind: string | null | undefined;
  fromBusiness: boolean;
  fromClientsTable: boolean;
}): UnifiedRowKind {
  if (input.fromClientsTable) return "cliente";

  const k = input.accountKind as UserAccountKind | undefined;

  if (k === "client") return "cliente";
  if (k === "business_staff") return "funcionario";
  if (input.fromBusiness || k === "business_owner") return "prestador";

  // Cadastro incompleto / legado sem kind explícito
  if (!k || k === "platform_admin") return "prestador";

  return "prestador";
}

export function operacoesKindLabel(kind: UnifiedRowKind): string {
  switch (kind) {
    case "prestador":
      return "Prestador";
    case "cliente":
      return "Cliente";
    case "funcionario":
      return "Funcionário";
    default:
      return kind;
  }
}
