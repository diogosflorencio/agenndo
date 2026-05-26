import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "Agendamento online pelo Agenndo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OgData = {
  name: string;
  city: string | null;
  segment: string | null;
};

async function fetchOgData(slug: string): Promise<OgData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb
    .from("businesses")
    .select("name, city, segment")
    .eq("slug", slug.trim())
    .maybeSingle();

  return data ?? null;
}

function hostLabel() {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!u?.startsWith("http")) return "agenndo.com.br";
  try {
    return new URL(u).host;
  } catch {
    return "agenndo.com.br";
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const biz = await fetchOgData(params.slug);
  const host = hostLabel();

  if (!biz) {
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
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background: "linear-gradient(135deg, #13EC5B, #0ea84a)",
              }}
            />
            <span style={{ fontSize: 72, fontWeight: 800, color: "#ffffff", letterSpacing: -2 }}>
              Agenndo
            </span>
          </div>
          <p
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Agendamento online para prestadores
          </p>
          <p style={{ marginTop: 20, fontSize: 18, color: "rgba(19,236,91,0.9)", fontWeight: 600 }}>
            {host}
          </p>
        </div>
      ),
      { ...size },
    );
  }

  const subtitle = [biz.city, biz.segment].filter(Boolean).join(" · ");

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
          padding: "60px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: biz.name.length > 30 ? 48 : 64,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 1000,
          }}
        >
          {biz.name}
        </div>

        {subtitle && (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 28,
              color: "rgba(255,255,255,0.75)",
              textAlign: "center",
            }}
          >
            {subtitle}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "absolute",
            bottom: 48,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg, #13EC5B, #0ea84a)",
            }}
          />
          <span style={{ fontSize: 20, color: "rgba(19,236,91,0.9)", fontWeight: 600 }}>
            Agende online · {host}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
