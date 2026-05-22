import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { corsHeadersForAllowedOrigin, isOriginAllowed } from "@/lib/cors";

const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, apikey, x-client-info, X-Requested-With";

/** SECURITY: bloqueia requisições cross-origin de domínios não autorizados. */
function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

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
  const corsBlock = handleCors(request);
  if (corsBlock) return corsBlock;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return withCorsHeaders(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
