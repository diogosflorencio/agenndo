import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { corsHeadersForAllowedOrigin, isOriginAllowed, isSameSiteAsRequest } from "@/lib/cors";

const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, apikey, x-client-info, X-Requested-With";

/** SECURITY: bloqueia requisições cross-origin de domínios não autorizados. */
function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  // Dashboard → /api no mesmo domínio (ex. www vs env sem www): não é cross-origin.
  if (isSameSiteAsRequest(request.url, origin)) return null;

  const allowed = isOriginAllowed(origin);
  const pathname = request.nextUrl.pathname;

  if (request.method === "OPTIONS") {
    if (!allowed) {
      return new NextResponse(null, { status: 403 });
    }
    const res = new NextResponse(null, { status: 204 });
    const cors = corsHeadersForAllowedOrigin(origin);
    if (cors) {
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      res.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
      res.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
      res.headers.set("Access-Control-Max-Age", "86400");
    }
    return res;
  }

  if (!allowed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    return new NextResponse("Forbidden", { status: 403 });
  }

  return null;
}

function withCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  const cors = corsHeadersForAllowedOrigin(origin);
  if (cors) {
    Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  if (hostname.startsWith("blog.")) {
    const url = request.nextUrl.clone();
    url.pathname = `/blog${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  const corsBlock = handleCors(request);
  if (corsBlock) return corsBlock;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Renova cookies de sessão a cada request (evita logout ao sair/voltar à página).
  await supabase.auth.getUser();

  return withCorsHeaders(request, supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
