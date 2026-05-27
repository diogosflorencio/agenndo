import { landingMetadata, LandingPage } from "@/lib/seo/landing-route";

const SLUG = "agenda-online-para-salao";

export const metadata = landingMetadata(SLUG);
export default function Page() {
  return <LandingPage slug={SLUG} />;
}
