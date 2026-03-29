import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getStripePriceIdForPlan } from "@/lib/stripe/prices";
import type { PlanId } from "@/lib/plans";
import { isPaidPlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await req.json()) as { businessId?: string; planId?: string };
    const businessId = body.businessId;
    const planId = body.planId as PlanId | undefined;

    if (!businessId || !planId || !isPaidPlanId(planId)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const priceId = getStripePriceIdForPlan(planId as PlanId);
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "Preço Stripe não configurado. Defina STRIPE_PRICE_PAID_01 … STRIPE_PRICE_PAID_20 (cada uma com um price_… do Stripe).",
        },
        { status: 503 }
      );
    }

    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("id, profile_id, stripe_customer_id, name")
      .eq("id", businessId)
      .single();

    if (bizErr || !business || business.profile_id !== user.id) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 403 });
    }

    const stripe = getStripe();
    let customerId = business.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: (business.name as string) ?? undefined,
        metadata: {
          business_id: businessId,
          profile_id: user.id,
        },
      });
      customerId = customer.id;
      await supabase.from("businesses").update({ stripe_customer_id: customerId }).eq("id", businessId);
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/conta?stripe=success`,
      cancel_url: `${origin}/dashboard/conta?stripe=cancel`,
      client_reference_id: businessId,
      metadata: {
        business_id: businessId,
        plan_id: planId,
      },
      /** Nome e endereço de cobrança coletados pelo Stripe no checkout. */
      billing_address_collection: "required",
      /** Sem trial no Stripe: o app já aplica 7 dias grátis via `trial_ends_at` / criação do negócio. */
      subscription_data: {
        metadata: {
          business_id: businessId,
          plan_id: planId,
        },
      },
      payment_method_collection: "if_required",
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Sessão sem URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
