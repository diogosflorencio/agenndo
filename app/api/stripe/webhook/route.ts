import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

function planFromMetadata(plan: string | undefined): string | undefined {
  if (!plan) return undefined;
  const legacy: Record<string, string> = {
    starter: "paid_02",
    growth: "paid_04",
    enterprise: "plan_enterprise",
    plano_1: "paid_02",
    plano_2: "paid_04",
    plano_3: "paid_09",
  };
  const n = legacy[plan] ?? plan;
  if (n === "free" || n === "plan_enterprise") return n;
  if (/^paid_(2[1-8])$/.test(n)) return "paid_20";
  if (/^paid_(0[1-9]|1[0-9]|20)$/.test(n)) return n;
  return undefined;
}

async function syncSubscriptionToBusiness(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  patch: Record<string, unknown>
) {
  await admin.from("businesses").update(patch).eq("id", businessId);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET não configurado" }, { status: 500 });
  }

  const body = await req.text();
  const sig = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Sem assinatura" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Service role ausente" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.business_id;
        if (!businessId) break;

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!customerId || !subId) break;

        const sub = await getStripe().subscriptions.retrieve(subId);
        const planId = planFromMetadata(session.metadata?.plan_id);

        await syncSubscriptionToBusiness(admin, businessId, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          subscription_status: sub.status,
          stripe_price_id: sub.items.data[0]?.price?.id ?? null,
          subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          billing_issue_deadline: null,
          ...(planId ? { plan: planId } : {}),
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        let businessId = sub.metadata?.business_id;

        if (!businessId) {
          const { data: row } = await admin
            .from("businesses")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .maybeSingle();
          businessId = row?.id;
        }

        if (!businessId) break;

        const { data: existing } = await admin
          .from("businesses")
          .select("billing_issue_deadline")
          .eq("id", businessId)
          .maybeSingle();

        const patch: Record<string, unknown> = {
          subscription_status: sub.status,
          stripe_price_id: sub.items.data[0]?.price?.id ?? null,
          subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        };

        if (sub.status === "active" || sub.status === "trialing") {
          patch.billing_issue_deadline = null;
        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          if (!existing?.billing_issue_deadline) {
            patch.billing_issue_deadline = new Date(Date.now() + 5 * 864e5).toISOString();
          }
        } else {
          patch.billing_issue_deadline = null;
        }

        await syncSubscriptionToBusiness(admin, businessId, patch);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: row } = await admin
          .from("businesses")
          .select("id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();

        if (!row?.id) break;

        await syncSubscriptionToBusiness(admin, row.id, {
          stripe_subscription_id: null,
          subscription_status: "canceled",
          stripe_price_id: null,
          subscription_current_period_end: null,
          billing_issue_deadline: null,
          plan: "free",
        });
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
