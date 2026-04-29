import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Agenndo: agendamento online para prestadores";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function publicHostLabel() {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!u?.startsWith("http")) return "agenndo.com.br";
  try {
    return new URL(u).host;
  } catch {
    return "agenndo.com.br";
  }
}

export default function Image() {
  const hostLabel = publicHostLabel();
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #020403 0%, #0a1f12 45%, #0d2818 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #13EC5B, #0ea84a)",
            }}
          />
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: -2,
            }}
          >
            Agenndo
          </span>
        </div>
        <p
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
            maxWidth: 900,
            textAlign: "center",
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          Agendamento online 24h · Link e QR Code · YWP (YourWebPlace)
        </p>
        <p
          style={{
            marginTop: 20,
            fontSize: 18,
            color: "rgba(19,236,91,0.9)",
            fontWeight: 600,
          }}
        >
          {hostLabel}
        </p>
      </div>
    ),
    { ...size }
  );
}
