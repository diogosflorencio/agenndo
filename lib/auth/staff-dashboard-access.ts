import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { StaffLink } from "@/lib/dashboard-context";

export type StaffCollaboratorRow = {
  id: string;
  business_id: string;
  businesses: { name: string } | { name: string }[] | null;
};

export function isStaffProfileComplete(profile: { full_name?: string | null } | null | undefined): boolean {
  const name = profile?.full_name?.trim() ?? "";
  return name.length >= 2;
}

export function mapStaffCollaboratorRows(rows: StaffCollaboratorRow[]): StaffLink[] {
  return rows.map((r) => {
    const biz = r.businesses;
    const name =
      Array.isArray(biz) ? biz[0]?.name : typeof biz === "object" && biz && "name" in biz ? biz.name : undefined;
    return {
      collaboratorId: r.id,
      businessId: r.business_id,
      businessName: name?.trim() || "Negócio",
    };
  });
}

/** Vínculos em collaborators (pode coexistir com negócio próprio). */
export async function fetchStaffCollaboratorRows(
  supabase: SupabaseClient,
  authUserId: string
): Promise<StaffCollaboratorRow[]> {
  const { data } = await supabase
    .from("collaborators")
    .select("id, business_id, businesses(name)")
    .eq("auth_user_id", authUserId);
  return (data ?? []) as StaffCollaboratorRow[];
}

/**
 * Garante perfil de prestador (role provider). Papéis dono/staff vêm de memberships + recompute SQL.
 */
export async function ensureProviderProfile(supabase: SupabaseClient, user: User): Promise<void> {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    null;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? undefined,
      full_name: fullName,
      avatar_url: avatarUrl,
      role: "provider",
    },
    { onConflict: "id" }
  );

  await supabase.rpc("recompute_user_primary_kind", { p_user_id: user.id });
}

/** @deprecated Use ensureProviderProfile */
export const ensureStaffProfile = ensureProviderProfile;
