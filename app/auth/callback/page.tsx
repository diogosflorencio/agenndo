import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ code?: string; next?: string; context?: string; error?: string }>;

export default async function AuthCallbackPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  if (params.error) {
    redirect(`/login?error=${encodeURIComponent(params.error)}`);
  }

  const code = params.code;
  const nextPath = params.next ?? "/dashboard";
  const context = params.context; // "cliente" para página pública

  if (!code) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    redirect(`/login?error=${encodeURIComponent(exchangeError.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Garantir que o profile existe (trigger no Supabase pode ter criado; senão, upsert)
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
  if (!profile) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? undefined,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
        avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? undefined,
        role: "provider",
      },
      { onConflict: "id" }
    );
  }

  // Prestador: se não tem negócio, vai para o setup
  if (context !== "cliente") {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!business) {
      redirect("/setup");
    }
  }

  redirect(nextPath);
}

// UI de loading exibida antes do redirect (streaming)
export function generateMetadata() {
  return { title: "Autenticando... | Agenndo" };
}
