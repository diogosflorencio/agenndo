"use client";

import { createContext, useContext, type ReactNode } from "react";

export type UserInfo = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type BusinessRow = {
  id: string;
  profile_id: string;
  name: string;
  slug: string;
  segment: string | null;
  phone: string | null;
  city: string | null;
  primary_color: string | null;
  logo_url: string | null;
  plan: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  stripe_price_id?: string | null;
  subscription_current_period_end?: string | null;
  trial_ends_at?: string | null;
  billing_issue_deadline?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  recommended_plan?: string | null;
  recommended_price_display?: number | null;
  onboarding_inputs?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DashboardContextValue = {
  user: UserInfo | null;
  profile: ProfileRow | null;
  business: BusinessRow | null;
  loading: boolean;
  refetch: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({
  user,
  profile,
  business,
  loading,
  refetch,
  children,
}: DashboardContextValue & { children: ReactNode }) {
  return (
    <DashboardContext.Provider value={{ user, profile, business, loading, refetch }}>
      {children}
    </DashboardContext.Provider>
  );
}
