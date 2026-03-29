import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug;
  const base = getSiteUrl();
  let title = "Agendar horário online";
  let description =
    "Marque seu horário online com segurança. Página de agendamento Agenndo — software completo para prestadores (YWP / YourWebPlace).";

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("businesses").select("name, city").eq("slug", slug).maybeSingle();
    if (data?.name) {
      const cityPart = data.city ? ` (${data.city})` : "";
      title = `${data.name} — agendar online${cityPart}`;
      description = `Agende horário em ${data.name}${cityPart}. Link oficial de agendamento; plataforma Agenndo (YWP).`;
    }
  } catch {
    /* fallback genérico */
  }

  const canonical = `${base}/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    manifest: `/${slug}/manifest`,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Agenndo",
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    appleWebApp: {
      capable: true,
      title: title.slice(0, 40),
      statusBarStyle: "black-translucent",
    },
  };
}

export default function PublicBookingSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
