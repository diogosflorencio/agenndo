import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { syncAccountOnLogin } from "@/lib/auth/sync-account-on-login";
import { resolveProviderLoginDestination } from "@/lib/auth/resolve-login-destination";
import type { OAuthLoginContext } from "@/lib/auth/oauth-popup";

function parseLoginContext(raw: string | null): OAuthLoginContext | null {
  if (raw === "cliente" || raw === "staff") return raw;
  return null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";
  const loginContext = parseLoginContext(requestUrl.searchParams.get("context"));
  const origin = requestUrl.origin;

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

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
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
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

  const resolvedContext: OAuthLoginContext | null =
    loginContext ??
    (nextPath.startsWith("/conta") ? "cliente" : nextPath.includes("minhas-comissoes") ? "staff" : null);

  await syncAccountOnLogin(supabase, user.id, {
    email: user.email,
    fullName: (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined,
    avatarUrl: (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) as string | undefined,
    loginContext: resolvedContext,
  });

  const { data: isOp } = await supabase.rpc("is_platform_operator");

  if (isOp === true) {
    redirectTo = `${origin}/operacoes`;
  } else if (resolvedContext === "cliente") {
    redirectTo = `${origin}${nextPath.startsWith("/") ? nextPath : `/${nextPath}`}`;
  } else {
    const dest = await resolveProviderLoginDestination(supabase, nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
    redirectTo = `${origin}${dest}`;
  }

  response.headers.set("Location", redirectTo);

  return response;
}
