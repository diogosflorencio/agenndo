import { landingMetadata, LandingPage } from "@/lib/seo/landing-route";

const SLUG = "plataforma-de-agendamento-online";

export const metadata = landingMetadata(SLUG);
export default function Page() {
  return <LandingPage slug={SLUG} />;
}
