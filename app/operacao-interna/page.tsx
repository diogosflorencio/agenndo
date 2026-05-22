import { redirect } from "next/navigation";

export default function LegacyOperacaoInternaRedirect() {
  redirect("/operacoes");
}
