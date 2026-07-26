import { createHmac, timingSafeEqual } from "crypto";

const VERSION = "v2";

type OAuthStatePayload = {
  v: string;
  userId: string;
  returnTo: string;
  codeVerifier: string;
};

function hmacKey(): string {
  const key = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!key) throw new Error("APP_ENCRYPTION_KEY ausente.");
  return key;
}

export function safeOAuthReturnPath(returnTo: string | null | undefined): string {
  const raw = (returnTo ?? "/dashboard/pagamentos").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard/pagamentos";
  if (raw.includes("://")) return "/dashboard/pagamentos";
  return raw.split("?")[0] + (raw.includes("?") ? raw.slice(raw.indexOf("?")) : "");
}

export function signMercadoPagoOAuthState(payload: {
  userId: string;
  returnTo: string;
  codeVerifier: string;
}): string {
  const inner: OAuthStatePayload = {
    v: VERSION,
    userId: payload.userId,
    returnTo: safeOAuthReturnPath(payload.returnTo),
    codeVerifier: payload.codeVerifier.trim(),
  };
  const data = Buffer.from(JSON.stringify(inner), "utf8").toString("base64url");
  const sig = createHmac("sha256", hmacKey()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Retorna true se `state` for do fluxo Mercado Pago (assinado com APP_ENCRYPTION_KEY). */
export function isMercadoPagoOAuthState(state: string | null | undefined): boolean {
  return verifyMercadoPagoOAuthState(state) !== null;
}

export function verifyMercadoPagoOAuthState(
  state: string | null | undefined
): { userId: string; returnTo: string; codeVerifier: string } | null {
  if (!state?.trim()) return null;
  const [data, sig] = state.trim().split(".");
  if (!data || !sig) return null;

  const expected = createHmac("sha256", hmacKey()).update(data).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OAuthStatePayload;
    if (parsed.v !== VERSION || typeof parsed.userId !== "string") return null;
    return {
      userId: parsed.userId,
      returnTo: safeOAuthReturnPath(parsed.returnTo),
      codeVerifier: typeof parsed.codeVerifier === "string" ? parsed.codeVerifier : "",
    };
  } catch {
    return parseLegacyV1PipeState(Buffer.from(data, "base64url").toString("utf8"));
  }
}

/** v1 usava `v1|userId|path|verifier` - paths com `/` quebravam no split. */
function parseLegacyV1PipeState(body: string): { userId: string; returnTo: string; codeVerifier: string } | null {
  const parts = body.split("|");
  if (parts[0] !== "v1" || parts.length < 3) return null;
  const userId = parts[1]!;
  if (parts.length === 3) {
    return { userId, returnTo: safeOAuthReturnPath(parts[2]), codeVerifier: "" };
  }
  const codeVerifier = parts[parts.length - 1] ?? "";
  const pathSegments = parts.slice(2, -1);
  const returnTo = safeOAuthReturnPath(pathSegments.join("/").replace(/^\/?/, "/"));
  return { userId, returnTo, codeVerifier };
}
