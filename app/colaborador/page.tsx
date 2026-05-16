import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";
import { getSiteUrl } from "@/lib/site-url";
import { ColaboradorEntrada } from "./colaborador-entrada";

const title = "Colaborador - entrar e ver comissões | Agenndo";
const description =
  "Instruções para profissionais da equipe: use o mesmo e-mail que o empregador vinculou e entre com Google em agenndo.com/colaborador para acessar Minhas comissões.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: "/colaborador",
    siteName: "Agenndo",
    locale: "pt_BR",
    type: "website",
  },
};

export default async function ColaboradorPage() {
  const siteOrigin = getSiteUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let linkedStaff = false;
  let isBusinessOwner = false;

  if (user) {
    const effId = await getEffectiveUserId(supabase);
    if (effId) {
      const { data: owned } = await supabase.from("businesses").select("id").eq("profile_id", effId).maybeSingle();
      isBusinessOwner = !!owned?.id;
      if (!isBusinessOwner) {
        const { data: collabRows } = await supabase
          .from("collaborators")
          .select("id")
          .eq("auth_user_id", effId)
          .limit(1);
        linkedStaff = (collabRows?.length ?? 0) > 0;
      }
    }
  }

  return (
    <ColaboradorEntrada siteOrigin={siteOrigin} linkedStaff={linkedStaff} isBusinessOwner={isBusinessOwner} />
  );
}
