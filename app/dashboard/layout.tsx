import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { normalizePlanId } from "@/lib/plans";

import { DashboardShell } from "./DashboardShell";

import type { StaffLink, UserInfo } from "@/lib/dashboard-context";

import {

  ensureProviderProfile,

  fetchStaffCollaboratorRows,

  mapStaffCollaboratorRows,

} from "@/lib/auth/staff-dashboard-access";
import { buildMobileNavItems } from "@/lib/dashboard-nav";



export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");



  const { data: effRaw, error: effError } = await supabase.rpc("get_effective_user_id");

  const effectiveUserId =

    !effError && typeof effRaw === "string" && effRaw.length > 0 ? effRaw : user.id;

  const isImpersonating = effectiveUserId !== user.id;



  const staffRows = isImpersonating ? [] : await fetchStaffCollaboratorRows(supabase, user.id);

  const staffContexts: StaffLink[] = mapStaffCollaboratorRows(staffRows);

  const hasStaffMembership = staffContexts.length > 0;



  if (!isImpersonating) {

    await ensureProviderProfile(supabase, user);

  }



  let { data: profile } = await supabase

    .from("profiles")

    .select("*")

    .eq("id", effectiveUserId)

    .maybeSingle();



  if (!profile && hasStaffMembership && !isImpersonating) {

    await ensureProviderProfile(supabase, user);

    const refetch = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    profile = refetch.data;

  }



  if (!profile) {

    redirect("/setup");

  }



  const { data: ownedBusiness } = await supabase

    .from("businesses")

    .select("*")

    .eq("profile_id", profile.id)

    .maybeSingle();



  const business = ownedBusiness ?? null;

  const isStaffDashboard = !ownedBusiness && hasStaffMembership;
  const showOwnerComissoesLink = hasStaffMembership && !isStaffDashboard;
  const mobileNavItems = buildMobileNavItems(isStaffDashboard, hasStaffMembership);

  const staffCollaboratorId = staffContexts[0]?.collaboratorId ?? null;



  if (!business && !hasStaffMembership) {

    redirect("/setup");

  }



  const userInfo: UserInfo = {

    id: profile.id,

    realUserId: user.id,

    isImpersonating,

    email: user.email ?? null,

    user_metadata: user.user_metadata ?? undefined,

  };



  const businessNormalized = business

    ? {

        ...business,

        plan: normalizePlanId(business.plan),

      }

    : null;

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

      hasStaffMembership={hasStaffMembership}

      showOwnerComissoesLink={showOwnerComissoesLink}

      mobileNavItems={mobileNavItems}

      staffCollaboratorId={staffCollaboratorId}

      staffContexts={staffContexts}

    >

      {children}

    </DashboardShell>

  );

}


