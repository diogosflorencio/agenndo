import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: impSession } = await supabase
    .from("session_impersonation")
    .select("real_uid")
    .eq("real_uid", user.id)
    .maybeSingle();
  if (impSession) {
    return NextResponse.json(
      { error: "Encerre o acesso compartilhado (voltar à sua conta) antes de excluir a conta." },
      { status: 403 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Exclusão de conta indisponível (configure SUPABASE_SERVICE_ROLE_KEY no servidor)." },
      { status: 503 }
    );
  }

  const { data: businesses } = await admin
    .from("businesses")
    .select("stripe_subscription_id")
    .eq("profile_id", user.id);

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      for (const row of businesses ?? []) {
        const subId = row.stripe_subscription_id as string | null;
        if (subId) {
          await stripe.subscriptions.cancel(subId);
        }
      }
    } catch {
      // segue com exclusão do usuário; assinatura pode ser cancelada manualmente no Stripe
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
