"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDashboard } from "@/lib/dashboard-context";

/** Colaborador sem negócio próprio: só Minhas comissões e Conta. */
export function StaffDashboardBoundary({ children }: { children: React.ReactNode }) {
  const { isStaffDashboard } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isStaffDashboard) return;
    const allowed =
      pathname.startsWith("/dashboard/minhas-comissoes") || pathname.startsWith("/dashboard/conta");
    if (!allowed) {
      router.replace("/dashboard/minhas-comissoes");
    }
  }, [isStaffDashboard, pathname, router]);

  return <>{children}</>;
}
