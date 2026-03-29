import { NextResponse } from "next/server";
import { isStripeConfiguredForPlan } from "@/lib/stripe/prices";
import type { PlanId } from "@/lib/plans";
import { isPaidPlanId } from "@/lib/plans";

export const runtime = "nodejs";

/** Para o dashboard (client): confirma no servidor se o price_id do plano está nas env vars. */
export async function GET(req: Request) {
  const planId = new URL(req.url).searchParams.get("planId") as PlanId | null;
  if (!planId || !isPaidPlanId(planId)) {
    return NextResponse.json({ configured: true });
  }
  return NextResponse.json({ configured: isStripeConfiguredForPlan(planId) });
}
