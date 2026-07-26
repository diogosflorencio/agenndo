import { buildHomeLandingJsonLd } from "@/lib/seo/home-landing-jsonld";

export function HomeFaqJsonLd() {
  const json = buildHomeLandingJsonLd();
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
