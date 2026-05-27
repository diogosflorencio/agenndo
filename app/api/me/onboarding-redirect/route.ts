import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";
import {
  fetchStaffCollaboratorRows,
  isStaffProfileComplete,
} from "@/lib/auth/staff-dashboard-access";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

export type OnboardingRedirectResponse = {
  /** Só redireciona quando já existe negócio próprio. */
  redirect: string | null;
  /** Vínculo em equipe (pode coexistir com cadastro de dono). */
  hasStaffMembership: boolean;
  profileComplete: boolean;
};

/**
 * Checagem server-side para /setup: dono de negócio ou colaborador já vinculado
 * redireciona para o painel (evita depender só do cliente Supabase / RLS).
 *
 * Em impersonação: só considera o perfil efetivo (conta visitada), nunca o colaborador
 * do operador de suporte — evita loop /setup ↔ /dashboard.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { redirect: null, hasStaffMembership: false, profileComplete: false } satisfies OnboardingRedirectResponse,
      { headers: NO_STORE_HEADERS }
    );
  }

  const effectiveUserId = (await getEffectiveUserId(supabase)) ?? user.id;
  const isImpersonating = effectiveUserId !== user.id;

  const { data: ownedBiz } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", effectiveUserId)
    .limit(1)
    .maybeSingle();

  if (ownedBiz?.id) {
    return NextResponse.json(
      {
        redirect: "/dashboard",
        hasStaffMembership: (await fetchStaffCollaboratorRows(supabase, user.id)).length > 0,
        profileComplete: true,
      } satisfies OnboardingRedirectResponse,
      { headers: NO_STORE_HEADERS }
    );
  }

  if (isImpersonating) {
    return NextResponse.json(
      { redirect: null, hasStaffMembership: false, profileComplete: false } satisfies OnboardingRedirectResponse,
      { headers: NO_STORE_HEADERS }
    );
  }

  const staffRows = await fetchStaffCollaboratorRows(supabase, user.id);
  const hasStaffMembership = staffRows.length > 0;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const profileComplete = isStaffProfileComplete(profile);

  return NextResponse.json(
    { redirect: null, hasStaffMembership, profileComplete } satisfies OnboardingRedirectResponse,
    { headers: NO_STORE_HEADERS }
  );
}
