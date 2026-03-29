import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

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

    const body = (await req.json()) as { businessId?: string };
    const businessId = body.businessId;
    if (!businessId) {
      return NextResponse.json({ error: "businessId obrigatório" }, { status: 400 });
    }

    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, profile_id, stripe_customer_id")
      .eq("id", businessId)
      .single();

    if (error || !business || business.profile_id !== user.id) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 403 });
    }

    const customerId = business.stripe_customer_id as string | null;
    if (!customerId) {
      return NextResponse.json(
        { error: "Nenhum cliente Stripe vinculado. Assine um plano pago primeiro." },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/conta`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
