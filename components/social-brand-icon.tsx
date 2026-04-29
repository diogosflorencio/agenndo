import type { CSSProperties } from "react";
import type { SocialPlatformId } from "@/lib/social-links";

type Props = {
  platform: SocialPlatformId;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/** Ícones de marca (SVG) para redes sociais na página pública e no dashboard. */
export function SocialBrandIcon({ platform, size = 20, className, style }: Props) {
  const cn = className ?? "";
  switch (platform) {
 
    // ─── Instagram ────────────────────────────────────────────────────────────
    // Fonte: Meta Brand Resources (glyph oficial 24×24)
    // Três sub-paths com fill-rule evenodd para gerar os "buracos" corretos:
    //   1. Contorno arredondado externo
    //   2. Círculo do meio (câmera)
    //   3. Ponto do flash (canto superior direito)
    case "instagram":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          className={cn}
          style={style}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        >
          <path d="M12 3c-2.444 0-2.75.01-3.71.054-.959.044-1.613.196-2.185.418A4.412 4.412 0 0 0 4.51 4.511a4.412 4.412 0 0 0-1.039 1.594c-.222.572-.374 1.226-.418 2.184C3.01 9.25 3 9.556 3 12s.01 2.75.054 3.71c.044.959.196 1.613.418 2.185a4.412 4.412 0 0 0 1.039 1.595 4.412 4.412 0 0 0 1.594 1.038c.572.222 1.226.374 2.184.418C9.25 20.99 9.556 21 12 21s2.75-.01 3.71-.054c.959-.044 1.613-.196 2.185-.418a4.412 4.412 0 0 0 1.595-1.038 4.412 4.412 0 0 0 1.038-1.595c.222-.572.374-1.226.418-2.184C20.99 14.75 21 14.444 21 12s-.01-2.75-.054-3.71c-.044-.959-.196-1.613-.418-2.185a4.412 4.412 0 0 0-1.038-1.594 4.412 4.412 0 0 0-1.595-1.039c-.572-.222-1.226-.374-2.184-.418C14.75 3.01 14.444 3 12 3Zm0 1.622c2.403 0 2.688.009 3.637.052.877.04 1.354.187 1.671.31.42.163.72.358 1.035.673.315.315.51.615.673 1.035.123.317.27.794.31 1.671.043.95.052 1.234.052 3.637s-.009 2.688-.052 3.637c-.04.877-.187 1.354-.31 1.671a2.788 2.788 0 0 1-.673 1.035 2.788 2.788 0 0 1-1.035.673c-.317.123-.794.27-1.671.31-.95.043-1.234.052-3.637.052s-2.688-.009-3.637-.052c-.877-.04-1.354-.187-1.671-.31a2.788 2.788 0 0 1-1.035-.673 2.788 2.788 0 0 1-.673-1.035c-.123-.317-.27-.794-.31-1.671C4.631 14.688 4.622 14.403 4.622 12s.009-2.688.052-3.637c.04-.877.187-1.354.31-1.671.163-.42.358-.72.673-1.035a2.788 2.788 0 0 1 1.035-.673c.317-.123.794-.27 1.671-.31.95-.043 1.234-.052 3.637-.052Z" />
          <path d="M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0-7.622a4.622 4.622 0 1 0 0 9.244 4.622 4.622 0 0 0 0-9.244Z" />
          <path d="M17.884 7.659a1.08 1.08 0 1 1-2.16 0 1.08 1.08 0 0 1 2.16 0Z" />
        </svg>
      );
 
    // ─── Facebook ─────────────────────────────────────────────────────────────
    // Fonte: Meta Brand Resources — ícone "f" sobre fundo redondo
    // Path único com fill-rule evenodd para o "f" branco recortado no círculo
    case "facebook":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          className={cn}
          style={style}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        >
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10Z" />
        </svg>
      );
 
    // ─── TikTok ───────────────────────────────────────────────────────────────
    // Fonte: TikTok Brand Book — nota musical estilizada
    // Path oficial em viewBox 24×24 (adaptado do simple-icons)
    case "tiktok":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          className={cn}
          style={style}
          fill="currentColor"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.16 8.16 0 0 0 4.78 1.52V6.82a4.85 4.85 0 0 1-1.01-.13Z" />
        </svg>
      );
 
    // ─── YouTube ──────────────────────────────────────────────────────────────
    // Fonte: YouTube Brand Resources — play button arredondado
    // Dois sub-paths: retângulo externo e triângulo de play (fill-rule evenodd)
    case "youtube":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          className={cn}
          style={style}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        >
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58Z" />
          <path d="M9.75 15.02V8.98L15.5 12l-5.75 3.02Z" fill="var(--yt-play, #fff)" style={{ mixBlendMode: "normal" }} />
        </svg>
      );
 
    // ─── LinkedIn ─────────────────────────────────────────────────────────────
    // Fonte: LinkedIn Brand Guidelines — "in" mark
    case "linkedin":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          className={cn}
          style={style}
          fill="currentColor"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
        </svg>
      );
 
    // ─── X (Twitter) ──────────────────────────────────────────────────────────
    // Fonte: Bootstrap Icons bi-twitter-x — path oficial com dois sub-paths
    // viewBox 0 0 16 16 reescalado para 0 0 24 24 com transformação
    case "x":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          className={cn}
          style={style}
          fill="currentColor"
        >
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      );
 
    default:
      return null;
  }
}

/** Cor sugerida por rede (ícone + texto na página pública). */
export function socialBrandAccent(platform: SocialPlatformId): string {
  switch (platform) {
    case "instagram":
      return "#E4405F";
    case "facebook":
      return "#1877F2";
    case "tiktok":
      return "#EE1D52";
    case "youtube":
      return "#FF0000";
    case "linkedin":
      return "#0A66C2";
    case "x":
      return "#000000";
    default:
      return "currentColor";
  }
}
