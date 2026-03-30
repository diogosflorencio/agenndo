import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";
import { normalizeDocumentPayload } from "@/lib/billing-fiscal";
import { syncStripeCustomerTaxId } from "@/lib/stripe/sync-billing";

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

    const body = (await req.json()) as Record<string, unknown>;
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
    if (!businessId) {
      return NextResponse.json({ error: "businessId é obrigatório" }, { status: 400 });
    }

    const effectiveId = await getEffectiveUserId(supabase);
    if (!effectiveId) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("id, profile_id, stripe_customer_id")
      .eq("id", businessId)
      .single();

    if (bizErr || !business || business.profile_id !== effectiveId) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 403 });
    }

    const parsed = normalizeDocumentPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { error: upErr } = await supabase
      .from("businesses")
      .update({ billing_document: parsed.billing_document })
      .eq("id", businessId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message ?? "Erro ao salvar" }, { status: 500 });
    }

    const stripeId = business.stripe_customer_id as string | null;
    if (stripeId) {
      try {
        await syncStripeCustomerTaxId(stripeId, parsed.billing_document);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao sincronizar Stripe";
        return NextResponse.json(
          { error: `CPF/CNPJ salvo localmente, mas o Stripe retornou erro: ${msg}. Tente de novo.` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
