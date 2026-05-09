import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId } from "@/lib/plans";
import { DashboardShell } from "./DashboardShell";
import type { UserInfo } from "@/lib/dashboard-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  /** Mesmo critério do RLS (effective_user_id): não usar profile.id !== user.id; perfis legados podem ter id ≠ auth.users.id. */
  const { data: effRaw, error: effError } = await supabase.rpc("get_effective_user_id");
  const effectiveUserId =
    !effError && typeof effRaw === "string" && effRaw.length > 0 ? effRaw : user.id;
  const isImpersonating = effectiveUserId !== user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", effectiveUserId)
    .maybeSingle();
  if (!profile) redirect("/setup");

  const { data: ownedBusiness } = await supabase.from("businesses").select("*").eq("profile_id", profile.id).maybeSingle();

  let business = ownedBusiness;
  let staffCollaboratorId: string | null = null;

  if (!ownedBusiness) {
    const { data: collabRow } = await supabase
      .from("collaborators")
      .select("id, business_id")
      .eq("auth_user_id", effectiveUserId)
      .maybeSingle();
    if (collabRow?.business_id) {
      staffCollaboratorId = collabRow.id;
      const { data: empBiz } = await supabase.from("businesses").select("*").eq("id", collabRow.business_id).maybeSingle();
      business = empBiz;
    }
  }

  if (!business) redirect("/setup");

  const isStaffDashboard = !ownedBusiness && !!staffCollaboratorId;

  const userInfo: UserInfo = {
    id: profile.id,
    realUserId: user.id,
    isImpersonating,
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
    <DashboardShell
      user={userInfo}
      profile={profileNormalized}
      business={businessNormalized}
      isStaffDashboard={isStaffDashboard}
      staffCollaboratorId={staffCollaboratorId}
    >
      {children}
    </DashboardShell>
  );
}
