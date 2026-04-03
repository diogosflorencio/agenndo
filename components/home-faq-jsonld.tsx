import { buildHomeFaqPageJsonLd } from "@/lib/seo/home-faq-jsonld";

export function HomeFaqJsonLd() {
  const json = buildHomeFaqPageJsonLd();
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
