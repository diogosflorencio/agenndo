"use client";

import { useState } from "react";
import { MOCK_USER } from "@/lib/mock-data";

const PALETTE = [
  { value: "#13EC5B", label: "Verde" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#8B5CF6", label: "Violeta" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#F59E0B", label: "Âmbar" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#6366F1", label: "Índigo" },
  { value: "#F97316", label: "Laranja" },
  { value: "#84CC16", label: "Lima" },
  { value: "#06B6D4", label: "Ciano" },
  { value: "#A855F7", label: "Púrpura" },
];

export default function PersonalizacaoPage() {
  const [form, setForm] = useState({
    businessName: MOCK_USER.businessName,
    tagline: "Seu visual, nossa paixão",
    primaryColor: "#13EC5B",
    about: "Bem-vindo à Barbearia Elite! Somos especializados em cortes modernos e barba tradicional.",
    instagram: "@barbeariaelite",
    whatsapp: "(11) 99999-8888",
    address: "Rua das Flores, 123 - São Paulo/SP",
    floatingWhatsapp: true,
    darkPage: false,
  });
  const [activeTab, setActiveTab] = useState<"aparencia" | "conteudo" | "contato" | "compartilhar">("aparencia");
  const [copied, setCopied] = useState(false);

  const publicUrl = `agenndo.com/${MOCK_USER.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${publicUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personalização</h1>
        <p className="text-gray-600 text-sm mt-1">Personalize a aparência da sua página pública</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl mb-5 shadow-sm">
            {[
              { key: "aparencia", label: "Aparência", icon: "palette" },
              { key: "conteudo", label: "Conteúdo", icon: "edit" },
              { key: "contato", label: "Contato", icon: "contacts" },
              { key: "compartilhar", label: "Compartilhar", icon: "share" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key ? "bg-primary text-black" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <span className="material-symbols-outlined text-sm hidden sm:block">{tab.icon}</span>
                <span className="hidden sm:block">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
              </button>
            ))}
          </div>

          {/* ── APARÊNCIA ── */}
          {activeTab === "aparencia" && (
            <div className="space-y-5">
              {/* Cor principal */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Cor principal</h3>
                <div className="grid grid-cols-6 gap-2">
                  {PALETTE.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setForm({ ...form, primaryColor: color.value })}
                      className={`aspect-square rounded-xl transition-all ${
                        form.primaryColor === color.value
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-gray-50 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Logo */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Logo / Foto de perfil</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="size-16 rounded-xl flex items-center justify-center text-2xl font-bold border-2"
                    style={{
                      backgroundColor: form.primaryColor + "20",
                      borderColor: form.primaryColor + "40",
                      color: form.primaryColor,
                    }}
                  >
                    {form.businessName[0]}
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">upload</span>
                      Upload logo
                    </button>
                    <p className="text-xs text-gray-500 mt-1.5">PNG, JPG até 2MB. 200×200px recomendado.</p>
                  </div>
                </div>
              </div>

              {/* Cover */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Foto de capa</h3>
                <div className="h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/40 transition-colors flex items-center justify-center cursor-pointer group">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-3xl transition-colors">
                      add_photo_alternate
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Clique para fazer upload (1200×400px)</p>
                  </div>
                </div>
              </div>

              {/* Dark mode */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Tema da página pública</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.darkPage ? "Modo escuro ativo" : "Modo claro ativo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-500 text-base">light_mode</span>
                    <button
                      onClick={() => setForm({ ...form, darkPage: !form.darkPage })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.darkPage ? "bg-primary" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className="inline-block size-4 rounded-full bg-white transition-transform shadow"
                        style={{ transform: form.darkPage ? "translateX(18px)" : "translateX(2px)" }}
                      />
                    </button>
                    <span className="material-symbols-outlined text-gray-500 text-base">dark_mode</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTEÚDO ── */}
          {activeTab === "conteudo" && (
            <div className="space-y-4">
              {[
                { label: "Nome do negócio", key: "businessName", placeholder: "Nome do seu negócio" },
                { label: "Tagline / Slogan", key: "tagline", placeholder: "Ex: Seu visual, nossa paixão" },
              ].map((field) => (
                <div key={field.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <label className="text-sm font-medium text-gray-700 block mb-2">{field.label}</label>
                  <input
                    type="text"
                    value={form[field.key as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
                  />
                </div>
              ))}

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <label className="text-sm font-medium text-gray-700 block mb-2">Sobre o negócio</label>
                <textarea
                  value={form.about}
                  onChange={(e) => setForm({ ...form, about: e.target.value })}
                  placeholder="Conte um pouco sobre seu negócio..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{form.about.length}/500</p>
              </div>

              {/* Galeria */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Galeria de fotos</label>
                  <span className="text-xs text-gray-500">0/8 fotos</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary/40 transition-colors flex items-center justify-center cursor-pointer group"
                    >
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-xl transition-colors">add</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CONTATO ── */}
          {activeTab === "contato" && (
            <div className="space-y-4">
              {[
                { label: "Instagram", key: "instagram", icon: "photo_camera", placeholder: "@seuperfil" },
                { label: "WhatsApp", key: "whatsapp", icon: "chat", placeholder: "(11) 99999-9999" },
                { label: "Endereço", key: "address", icon: "location_on", placeholder: "Rua, Número - Cidade/UF" },
              ].map((field) => (
                <div key={field.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <label className="text-sm font-medium text-gray-700 block mb-2">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">
                      {field.icon}
                    </span>
                    <input
                      type="text"
                      value={form[field.key as keyof typeof form] as string}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl pl-10 pr-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              ))}

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Botão WhatsApp flutuante</p>
                    <p className="text-xs text-gray-500 mt-0.5">Exibir botão fixo na página pública</p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, floatingWhatsapp: !form.floatingWhatsapp })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.floatingWhatsapp ? "bg-primary" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className="inline-block size-4 rounded-full bg-white transition-transform shadow"
                      style={{ transform: form.floatingWhatsapp ? "translateX(18px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── COMPARTILHAR ── */}
          {activeTab === "compartilhar" && (
            <div className="space-y-4">
              {/* Link */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Seu link público</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 flex items-center">
                    <span className="text-gray-600 text-sm truncate">{publicUrl}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`h-11 px-4 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      copied
                        ? "bg-primary text-black"
                        : "bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copied ? "check" : "content_copy"}
                    </span>
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">QR Code</h3>
                <div className="flex items-start gap-4">
                  {/* QR placeholder */}
                  <div
                    className="size-32 rounded-xl flex-shrink-0 flex items-center justify-center border-2"
                    style={{ borderColor: form.primaryColor + "40", backgroundColor: form.primaryColor + "10" }}
                  >
                    <QRCodePlaceholder color={form.primaryColor} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Imprima e cole na recepção para que clientes agendem escaneando com o celular.
                    </p>
                    <a
                      href="/dashboard/qrcode"
                      className="w-full py-2.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">qr_code_2</span>
                      Gerar e imprimir QR Code
                    </a>
                  </div>
                </div>
              </div>

              {/* Instagram tip */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl flex-shrink-0 mt-0.5">tips_and_updates</span>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">Dica: Instagram Bio</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Adicione seu link ao Instagram. Vá em Editar Perfil → Site → cole seu link do Agenndo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <button className="w-full mt-5 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">save</span>
            Salvar alterações
          </button>
        </div>

        {/* Preview side */}
        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Preview da página pública
            </p>
            <PagePreview form={form} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PagePreview({ form }: { form: { businessName: string; tagline: string; primaryColor: string; about: string; instagram: string; address: string; floatingWhatsapp: boolean; darkPage: boolean } }) {
  const bg = form.darkPage ? "bg-[#020403]" : "bg-gray-50";
  const cardBg = form.darkPage ? "bg-[#0f1c15] border-white/5" : "bg-white border-gray-200";
  const text = form.darkPage ? "text-white" : "text-gray-900";
  const subtext = form.darkPage ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`rounded-2xl overflow-hidden border ${form.darkPage ? "border-white/10" : "border-gray-200"} ${bg}`}>
      {/* Cover */}
      <div
        className="h-20 relative"
        style={{ background: `linear-gradient(135deg, ${form.primaryColor}20, ${form.primaryColor}40)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-full h-full" style={{ background: `linear-gradient(45deg, transparent, ${form.primaryColor})` }} />
        </div>
      </div>

      {/* Profile */}
      <div className={`px-4 pb-4 ${cardBg} border-b`}>
        <div className="flex items-end justify-between -mt-6 mb-3">
          <div
            className="size-14 rounded-xl border-4 flex items-center justify-center text-xl font-bold"
            style={{
              backgroundColor: form.primaryColor + "20",
              borderColor: form.darkPage ? "#0f1c15" : "#f9fafb",
              color: form.primaryColor,
            }}
          >
            {form.businessName[0]}
          </div>
          <button
            className="px-3 py-1.5 text-xs font-bold rounded-lg text-black"
            style={{ backgroundColor: form.primaryColor }}
          >
            Agendar
          </button>
        </div>
        <h2 className={`font-bold text-sm ${text}`}>{form.businessName}</h2>
        <p className={`text-xs ${subtext} mt-0.5`}>{form.tagline}</p>
        {form.address && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className={`material-symbols-outlined text-xs ${subtext}`}>location_on</span>
            <p className={`text-xs ${subtext} truncate`}>{form.address}</p>
          </div>
        )}
      </div>

      {/* Services preview */}
      <div className="p-4">
        <p className={`text-xs font-bold mb-2 ${text}`}>Serviços</p>
        <div className="space-y-2">
          {[
            { name: "Corte Masculino", price: "R$ 45", time: "30min", emoji: "✂️" },
            { name: "Corte + Barba", price: "R$ 80", time: "60min", emoji: "💈" },
          ].map((s) => (
            <div
              key={s.name}
              className={`flex items-center gap-2 p-2.5 rounded-lg border ${cardBg}`}
            >
              <span className="text-base">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${text}`}>{s.name}</p>
                <p className={`text-xs ${subtext}`}>{s.time}</p>
              </div>
              <span className="text-xs font-bold flex-shrink-0" style={{ color: form.primaryColor }}>
                {s.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp */}
      {form.floatingWhatsapp && (
        <div className="relative px-4 pb-4">
          <div className="flex justify-end">
            <div
              className="size-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: "#25D366" }}
            >
              <span className="material-symbols-outlined text-white text-lg">chat</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QRCodePlaceholder({ color }: { color: string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      {/* Top-left finder */}
      <rect x="4" y="4" width="24" height="24" rx="3" fill={color} opacity="0.3" />
      <rect x="8" y="8" width="16" height="16" rx="2" fill={color} opacity="0.5" />
      <rect x="12" y="12" width="8" height="8" rx="1" fill={color} />
      {/* Top-right finder */}
      <rect x="52" y="4" width="24" height="24" rx="3" fill={color} opacity="0.3" />
      <rect x="56" y="8" width="16" height="16" rx="2" fill={color} opacity="0.5" />
      <rect x="60" y="12" width="8" height="8" rx="1" fill={color} />
      {/* Bottom-left finder */}
      <rect x="4" y="52" width="24" height="24" rx="3" fill={color} opacity="0.3" />
      <rect x="8" y="56" width="16" height="16" rx="2" fill={color} opacity="0.5" />
      <rect x="12" y="60" width="8" height="8" rx="1" fill={color} />
      {/* Data dots */}
      {[36, 40, 44, 48, 52, 56, 60, 64, 68, 72].map((x) =>
        [36, 40, 44, 48, 52, 56, 60, 64, 68, 72].map((y) =>
          Math.random() > 0.5 ? (
            <rect key={`${x}-${y}`} x={x - 76} y={y - 36} width="3" height="3" rx="0.5" fill={color} opacity="0.6" />
          ) : null
        )
      )}
      {/* Simple dots pattern for data area */}
      <rect x="34" y="4" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="42" y="4" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="34" y="10" width="4" height="4" rx="1" fill={color} opacity="0.4" />
      <rect x="42" y="10" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="4" y="34" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="10" y="34" width="4" height="4" rx="1" fill={color} opacity="0.4" />
      <rect x="4" y="42" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="10" y="42" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="34" y="34" width="4" height="4" rx="1" fill={color} opacity="0.9" />
      <rect x="40" y="34" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="46" y="34" width="4" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="52" y="34" width="4" height="4" rx="1" fill={color} opacity="0.3" />
      <rect x="58" y="34" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="64" y="34" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="70" y="34" width="4" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="34" y="40" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="40" y="40" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="46" y="40" width="4" height="4" rx="1" fill={color} opacity="0.4" />
      <rect x="52" y="40" width="4" height="4" rx="1" fill={color} opacity="0.9" />
      <rect x="58" y="46" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="64" y="46" width="4" height="4" rx="1" fill={color} opacity="0.3" />
      <rect x="70" y="46" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="34" y="52" width="4" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="40" y="58" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="46" y="64" width="4" height="4" rx="1" fill={color} opacity="0.9" />
      <rect x="52" y="70" width="4" height="4" rx="1" fill={color} opacity="0.4" />
      <rect x="64" y="58" width="4" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="70" y="64" width="4" height="4" rx="1" fill={color} opacity="0.5" />
    </svg>
  );
}
