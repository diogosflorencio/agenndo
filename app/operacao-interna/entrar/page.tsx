import { redirect } from "next/navigation";

export default function LegacyEntrarRedirect() {
  redirect("/operacoes/entrar");
}
