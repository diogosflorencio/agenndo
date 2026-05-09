"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type DashboardNotificationRow = {
  id: string;
  business_id: string;
  title: string;
  body: string | null;
  icon: string;
  read_at: string | null;
  created_at: string;
};

export async function fetchDashboardNotificationsSummary(
  supabase: SupabaseClient,
  businessId: string
): Promise<{ unreadCount: number; latestUnread: DashboardNotificationRow | null }> {
  const countQuery = supabase
    .from("dashboard_notifications")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .is("read_at", null);

  const latestQuery = supabase
    .from("dashboard_notifications")
    .select("id, business_id, title, body, icon, read_at, created_at")
    .eq("business_id", businessId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ count, error: countErr }, { data: latest, error: latestErr }] = await Promise.all([countQuery, latestQuery]);

  if (countErr || latestErr) {
    console.warn("[dashboard_notifications]", countErr ?? latestErr);
    return { unreadCount: 0, latestUnread: null };
  }

  return {
    unreadCount: count ?? 0,
    latestUnread: (latest as DashboardNotificationRow | null) ?? null,
  };
}

export async function fetchRecentDashboardNotifications(
  supabase: SupabaseClient,
  businessId: string,
  limit = 40
): Promise<DashboardNotificationRow[]> {
  const { data, error } = await supabase
    .from("dashboard_notifications")
    .select("id, business_id, title, body, icon, read_at, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[dashboard_notifications] list", error);
    return [];
  }
  return (data as DashboardNotificationRow[]) ?? [];
}

/** Marca várias notificações como lidas (mesmo business_id). */
export async function markDashboardNotificationsAsRead(
  supabase: SupabaseClient,
  businessId: string,
  ids: string[]
): Promise<boolean> {
  if (ids.length === 0) return true;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("dashboard_notifications")
    .update({ read_at: now })
    .eq("business_id", businessId)
    .in("id", ids)
    .is("read_at", null);

  if (error) {
    console.warn("[dashboard_notifications] mark read", error);
    return false;
  }
  return true;
}

/** Marca todas as não lidas do negócio (ex.: ao abrir o painel do sino). */
export async function markAllUnreadDashboardNotifications(
  supabase: SupabaseClient,
  businessId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("dashboard_notifications")
    .update({ read_at: now })
    .eq("business_id", businessId)
    .is("read_at", null);

  if (error) {
    console.warn("[dashboard_notifications] mark all read", error);
    return false;
  }
  return true;
}

/** Badge na shell + prévia na home; refetch ao focar a aba. */
export function useDashboardNotifications(businessId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestUnread, setLatestUnread] = useState<DashboardNotificationRow | null>(null);
  const [loading, setLoading] = useState(!!businessId);

  const refresh = useCallback(async () => {
    if (!businessId) {
      setUnreadCount(0);
      setLatestUnread(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const summary = await fetchDashboardNotificationsSummary(supabase, businessId);
    setUnreadCount(summary.unreadCount);
    setLatestUnread(summary.latestUnread);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { unreadCount, latestUnread, loading, refresh };
}
