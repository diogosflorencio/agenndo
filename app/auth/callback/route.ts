import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";
  const context = requestUrl.searchParams.get("context");
  const origin = requestUrl.origin;

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Resposta de redirect que receberá os cookies da sessão
  let redirectTo = `${origin}${nextPath.startsWith("/") ? nextPath : `/${nextPath}`}`;
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => response.cookies.set(name, value));
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Garantir que o profile existe
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

  // Prestador: se não tem negócio, redirecionar para o setup
  if (context !== "cliente") {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!business) {
      redirectTo = `${origin}/setup`;
      const setupResponse = NextResponse.redirect(redirectTo);
      const setCookies = response.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) {
        const [nameValue, ...rest] = cookie.split(";").map((s) => s.trim());
        const eq = nameValue.indexOf("=");
        if (eq > 0) setupResponse.cookies.set(nameValue.slice(0, eq), nameValue.slice(eq + 1));
      }
      return setupResponse;
    }
  }

  return response;
}
