import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPosts } from "@/lib/blog/posts";

export const runtime = "edge";
export const alt = "Blog Agenndo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#020403",
            color: "white",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          Blog Agenndo
        </div>
      ),
      size,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          fontFamily: "sans-serif",
          background: "linear-gradient(160deg, #0f1c15 0%, #020403 50%, #020403 100%)",
          color: "white",
        }}
      >
        {/* Top section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "rgba(19,236,91,0.15)",
                color: "#13EC5B",
                fontSize: 18,
                fontWeight: 600,
                padding: "6px 20px",
                borderRadius: "100px",
              }}
            >
              {post.category}
            </div>
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: "900px",
              letterSpacing: "-0.02em",
            }}
          >
            {post.title}
          </div>
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "32px",
                background: "#13EC5B",
                borderRadius: "4px",
              }}
            />
            <span style={{ fontSize: 24, fontWeight: 600 }}>
              Blog{" "}
              <span style={{ color: "#13EC5B" }}>Agenndo</span>
            </span>
          </div>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            blog.agenndo.com.br
          </div>
        </div>
      </div>
    ),
    size,
  );
}
