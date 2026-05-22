"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@/lib/plans";

type Props = {
  businessId: string;
  initial: {
    plan: PlanId;
    subscription_status: string | null;
    trial_ends_at: string | null;
    billing_issue_deadline: string | null;
  };
  planOptions: PlanId[];
};

export function EditarNegocioForm({ businessId, initial, planOptions }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial.plan);
  const [subscriptionStatus, setSubscriptionStatus] = useState(initial.subscription_status ?? "");
  const [trialEnds, setTrialEnds] = useState(
    initial.trial_ends_at ? initial.trial_ends_at.slice(0, 16) : ""
  );
  const [billingDeadline, setBillingDeadline] = useState(
    initial.billing_issue_deadline ? initial.billing_issue_deadline.slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        plan,
        subscription_status: subscriptionStatus.trim() || null,
        trial_ends_at: trialEnds ? new Date(trialEnds).toISOString() : null,
        billing_issue_deadline: billingDeadline ? new Date(billingDeadline).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Guardado.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-white/10 bg-[#0d2316] p-6">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Plano</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanId)}
          className="w-full h-11 rounded-xl bg-[#14221A] border border-[#213428] px-3 text-sm text-white"
        >
          {planOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">subscription_status (Stripe)</label>
        <input
          value={subscriptionStatus}
          onChange={(e) => setSubscriptionStatus(e.target.value)}
          placeholder="trialing, active, past_due, canceled…"
          className="w-full h-11 rounded-xl bg-[#14221A] border border-[#213428] px-3 text-sm text-white"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">trial_ends_at</label>
        <input
          type="datetime-local"
          value={trialEnds}
          onChange={(e) => setTrialEnds(e.target.value)}
          className="w-full h-11 rounded-xl bg-[#14221A] border border-[#213428] px-3 text-sm text-white"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">billing_issue_deadline</label>
        <input
          type="datetime-local"
          value={billingDeadline}
          onChange={(e) => setBillingDeadline(e.target.value)}
          className="w-full h-11 rounded-xl bg-[#14221A] border border-[#213428] px-3 text-sm text-white"
        />
      </div>

      {msg ? <p className="text-sm text-primary">{msg}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar alterações"}
      </button>
    </form>
  );
}
