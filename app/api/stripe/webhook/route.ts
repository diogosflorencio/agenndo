import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

function planFromMetadata(plan: string | undefined): string | undefined {
  if (!plan) return undefined;
  const legacy: Record<string, string> = {
    starter: "plano_1",
    growth: "plano_2",
    enterprise: "plano_3",
  };
  const n = legacy[plan] ?? plan;
  if (["plano_1", "plano_2", "plano_3", "free"].includes(n)) return n;
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

        await syncSubscriptionToBusiness(admin, businessId, {
          subscription_status: sub.status,
          stripe_price_id: sub.items.data[0]?.price?.id ?? null,
          subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
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
