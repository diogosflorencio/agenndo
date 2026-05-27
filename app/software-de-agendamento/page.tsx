import { landingMetadata, LandingPage } from "@/lib/seo/landing-route";

const SLUG = "software-de-agendamento";

export const metadata = landingMetadata(SLUG);
export default function Page() {
  return <LandingPage slug={SLUG} />;
}
