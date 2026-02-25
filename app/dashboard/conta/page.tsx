"use client";

import { useState, useEffect } from "react";
import { MOCK_USER } from "@/lib/mock-data";
import { calculateDynamicPlan } from "@/lib/planCalculator";

type Tab = "plano" | "negocio" | "seguranca";

const INVOICES = [
  { id: "1", date: "01/01/2024", amount: 89.90, status: "pago" },
  { id: "2", date: "01/12/2023", amount: 89.90, status: "pago" },
  { id: "3", date: "01/11/2023", amount: 89.90, status: "pago" },
];

export default function ContaPage() {
  const [tab, setTab] = useState<Tab>("plano");
  const [form, setForm] = useState({
    businessName: MOCK_USER.businessName,
    phone: MOCK_USER.phone,
    city: MOCK_USER.city,
    slug: MOCK_USER.slug,
    segment: MOCK_USER.segment,
  });

  // Plano dinâmico: o que o usuário vê é o plano destinado a ele (vindo do onboarding ou mock)
  const dynamicPlan = calculateDynamicPlan("2-5", 15, 80); // mock: mesmo perfil do onboarding
  const [monthlyPrice, setMonthlyPrice] = useState(89.9);
  useEffect(() => {
    const p = localStorage.getItem("agenndo_plan_price");
    if (p) setMonthlyPrice(Number(p));
  }, []);
  // Próxima fatura: ciclo de cobrança (não há limite de agendamentos por mês)
  const nextBillingDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  })();

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conta</h1>
        <p className="text-gray-600 text-sm mt-1">Gerencie seu plano e configurações</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
        {[
          { key: "plano", label: "Meu plano", icon: "workspace_premium" },
          { key: "negocio", label: "Dados do negócio", icon: "store" },
          { key: "seguranca", label: "Segurança", icon: "security" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key ? "bg-primary text-black" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-sm hidden sm:block">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLANO (único card, plano destinado ao usuário) ── */}
      {tab === "plano" && (
        <div className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-gray-900">Seu plano</h2>
                  <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
                    Ativo
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{dynamicPlan.infrastructure}</p>
                <p className="text-2xl font-extrabold text-gray-900">
                  R$ {monthlyPrice.toFixed(2).replace(".", ",")}
                  <span className="text-sm text-gray-500 font-normal">/mês</span>
                </p>
              </div>
              <span className="material-symbols-outlined text-primary text-4xl">workspace_premium</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Próxima cobrança</span>
                <span className="text-gray-900 font-semibold">{nextBillingDate}</span>
              </div>
              <p className="text-xs text-gray-500">
                O valor é cobrado no início de cada ciclo. Não há limite de agendamentos.
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">support_agent</span>
                Falar com suporte
              </a>
              <button className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm transition-all">
                Cancelar plano
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Recursos inclusos</h3>
            <div className="space-y-2">
              {dynamicPlan.features.map((f) => (
                <div key={f.title} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                  {f.title} — {f.sub}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Histórico de faturas</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {INVOICES.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-gray-900">{inv.date}</p>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      R$ {inv.amount.toFixed(2).replace(".", ",")}
                    </span>
                    <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                      <span className="material-symbols-outlined text-base">download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEGÓCIO ── */}
      {tab === "negocio" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            {[
              { label: "Nome do negócio", key: "businessName", type: "text" },
              { label: "Telefone", key: "phone", type: "tel" },
              { label: "Cidade", key: "city", type: "text" },
              { label: "Segmento", key: "segment", type: "text" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
                />
              </div>
            ))}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">URL pública</label>
              <div className="flex items-center h-11 bg-gray-50 border border-gray-200 focus-within:border-primary rounded-xl overflow-hidden transition-colors">
                <span className="px-3 text-gray-500 text-sm border-r border-gray-200 h-full flex items-center flex-shrink-0">
                  agenndo.com/
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="flex-1 h-full bg-transparent px-3 text-gray-900 text-sm outline-none"
                />
              </div>
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                Alterar o slug mudará seu link público. Avise seus clientes.
              </p>
            </div>
          </div>

          <button className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">save</span>
            Salvar alterações
          </button>
        </div>
      )}

      {/* ── SEGURANÇA ── */}
      {tab === "seguranca" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Conta vinculada</h3>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GoogleIcon />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-semibold text-sm">{MOCK_USER.name}</p>
                <p className="text-gray-500 text-xs">{MOCK_USER.email}</p>
                <p className="text-xs text-primary mt-0.5">Conta Google vinculada</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Sessão ativa</h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined text-primary text-xl">computer</span>
              <div className="flex-1">
                <p className="text-gray-900 text-sm font-medium">Chrome — São Paulo, BR</p>
                <p className="text-gray-500 text-xs">Último acesso: agora</p>
              </div>
              <span className="size-2 rounded-full bg-primary" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition-all">
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="text-sm font-medium">Sair da conta</span>
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">warning</span>
              Zona de perigo
            </h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Excluir sua conta é uma ação irreversível. Todos os dados, agendamentos e configurações serão permanentemente removidos.
            </p>
            <button className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">delete_forever</span>
              Excluir minha conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
