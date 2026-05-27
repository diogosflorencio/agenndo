import { createHmac, timingSafeEqual } from "crypto";

const VERSION = "v1";

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
  const returnTo = safeOAuthReturnPath(payload.returnTo);
  const verifier = payload.codeVerifier.trim();
  const body = `${VERSION}|${payload.userId}|${returnTo}|${verifier}`;
  const sig = createHmac("sha256", hmacKey()).update(body).digest("base64url");
  const data = Buffer.from(body, "utf8").toString("base64url");
  return `${data}.${sig}`;
}

export function verifyMercadoPagoOAuthState(
  state: string
): { userId: string; returnTo: string; codeVerifier: string } | null {
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;
  const body = Buffer.from(data, "base64url").toString("utf8");
  const expected = createHmac("sha256", hmacKey()).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const parts = body.split("|");
  if (parts[0] !== VERSION || parts.length < 3) return null;
  if (parts.length >= 4) {
    return {
      userId: parts[1]!,
      returnTo: safeOAuthReturnPath(parts[2]),
      codeVerifier: parts[3] ?? "",
    };
  }
  return { userId: parts[1]!, returnTo: safeOAuthReturnPath(parts.slice(2).join("|")), codeVerifier: "" };
}
