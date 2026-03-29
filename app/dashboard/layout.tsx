import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId } from "@/lib/plans";
import { DashboardShell } from "./DashboardShell";
import type { UserInfo } from "@/lib/dashboard-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: business } = await supabase.from("businesses").select("*").eq("profile_id", user.id).maybeSingle();
  if (!business) redirect("/setup");

  const userInfo: UserInfo = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: user.user_metadata ?? undefined,
  };

  const businessNormalized = {
    ...business,
    plan: normalizePlanId(business.plan),
  };
  const profileNormalized = profile
    ? {
        ...profile,
        recommended_plan: profile.recommended_plan
          ? normalizePlanId(profile.recommended_plan)
          : null,
      }
    : profile;

  return (
    <DashboardShell user={userInfo} profile={profileNormalized} business={businessNormalized}>
      {children}
    </DashboardShell>
  );
}
