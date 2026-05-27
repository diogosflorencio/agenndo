import { createHash, randomBytes } from "crypto";

/** PKCE S256 — exigido se o app MP tiver "authorization code with PKCE" ativado. */
export function createMercadoPagoPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
