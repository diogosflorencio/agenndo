"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { compressImageForUpload } from "@/lib/image-compress";
import { uploadBusinessImage, removeBusinessObject, tryRelativePathFromPublicUrl } from "@/lib/business-assets-storage";
import { cn } from "@/lib/utils";
import {
  SERVICE_VARIANT_COMPRESS_MAX_LONG_EDGE,
  SERVICE_VARIANT_MAX_PHOTOS,
  emptyVariantSlot,
  type ServiceVariantItem,
} from "@/lib/service-variants";

const ACCENT_SOFT = "#13EC5B55";

function extFromFile(f: File): string {
  if (f.type === "image/png") return "png";
  if (f.type === "image/webp") return "webp";
  if (f.type === "image/gif") return "gif";
  return "jpg";
}

function padThree(slots: ServiceVariantItem[]): ServiceVariantItem[] {
  const out = [...slots];
  while (out.length < SERVICE_VARIANT_MAX_PHOTOS) out.push(emptyVariantSlot());
  return out.slice(0, SERVICE_VARIANT_MAX_PHOTOS);
}

type Props = {
  businessId: string;
  serviceId: string;
  /** Preço base do serviço (R$), para referência no campo opcional por variação. */
  basePriceReais: number;
  slots: ServiceVariantItem[];
  onSlotsChange: (next: ServiceVariantItem[]) => void;
  disabled?: boolean;
};

export function ServiceVariantGalleryEditor({
  businessId,
  serviceId,
  basePriceReais,
  slots,
  onSlotsChange,
  disabled,
}: Props) {
  const padded = padThree(slots);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const removeRemote = async (url: string) => {
    const rel = tryRelativePathFromPublicUrl(url, businessId);
    if (!rel) return;
    try {
      await removeBusinessObject(createClient(), businessId, rel);
    } catch {
      /* opcional */
    }
  };

  const commit = (nextPadded: ServiceVariantItem[]) => {
    onSlotsChange(padThree(nextPadded));
  };

  const updateRow = (index: number, patch: Partial<ServiceVariantItem>) => {
    const next = padded.map((s, i) => (i === index ? { ...s, ...patch } : s));
    commit(next);
  };

  const onPickFile = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    setSlotError(null);
    setBusySlot(index);
    try {
      const prepared = await compressImageForUpload(file, { maxLongEdge: SERVICE_VARIANT_COMPRESS_MAX_LONG_EDGE });
      const ext = extFromFile(prepared);
      const prevUrl = padded[index]?.url;
      if (prevUrl) await removeRemote(prevUrl);
      const path = `services/${serviceId}/variants/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const url = await uploadBusinessImage(supabase, businessId, path, prepared);
      updateRow(index, { url });
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setBusySlot(null);
    }
  };

  const removeRow = async (index: number) => {
    const url = padded[index]?.url;
    if (url) await removeRemote(url);
    updateRow(index, { url: "", title: "", description: "", price_cents: null });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-800">Variações do serviço (opcional)</label>
        <p className="text-[11px] text-gray-500 mt-1 leading-snug">
          Até {SERVICE_VARIANT_MAX_PHOTOS} fotos leves com título ou texto curto. Na página pública o cliente pode escolher
          uma opção ou manter o serviço padrão. Você pode definir um preço diferente por opção (opcional).
        </p>
      </div>

      {slotError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
          {slotError}
        </p>
      )}

      <div className="space-y-4">
        {padded.map((slot, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 shadow-sm"
          >
            <div className="flex gap-3">
              <div className="relative shrink-0 size-20">
                <div
                  className={cn(
                    "relative size-full rounded-2xl overflow-hidden border-2 shadow-md transition-all bg-gray-50",
                    slot.url ? "border-gray-200" : "border-dashed border-gray-300",
                  )}
                  style={slot.url ? undefined : { borderColor: ACCENT_SOFT }}
                >
                  {slot.url ? (
                    <Image src={slot.url} alt="" width={80} height={80} className="size-full object-cover" unoptimized />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-gray-50">
                      <span className="material-symbols-outlined text-gray-400 text-3xl">photo_library</span>
                    </div>
                  )}
                  {busySlot === index && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] z-[1]">
                      <div className="size-7 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    </div>
                  )}

                  {!disabled && (
                    <div className="absolute bottom-1 right-1 z-[2] flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => inputRefs.current[index]?.click()}
                        disabled={busySlot !== null}
                        title={slot.url ? "Trocar foto" : "Adicionar foto"}
                        className="size-7 rounded-lg bg-primary text-black shadow-md border border-white/90 flex items-center justify-center hover:brightness-95 disabled:opacity-50 transition-transform active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[15px] leading-none">
                          {slot.url ? "photo_camera" : "add_a_photo"}
                        </span>
                      </button>
                      {slot.url ? (
                        <button
                          type="button"
                          onClick={() => void removeRow(index)}
                          disabled={busySlot !== null}
                          title="Remover foto e texto"
                          className="size-7 rounded-lg bg-white text-red-600 shadow-md border border-gray-200/90 flex items-center justify-center hover:bg-red-50 disabled:opacity-50 transition-transform active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[15px] leading-none">delete</span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={disabled || busySlot !== null}
                  onChange={(ev) => void onPickFile(index, ev)}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                <input
                  type="text"
                  placeholder="Título da variação"
                  value={slot.title}
                  disabled={disabled}
                  maxLength={80}
                  onChange={(e) => updateRow(index, { title: e.target.value })}
                  className="w-full h-9 text-sm bg-white border border-gray-200 rounded-lg px-3 outline-none focus:border-primary"
                />
                <textarea
                  placeholder="Descrição opcional para o cliente"
                  value={slot.description}
                  disabled={disabled}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-primary resize-none"
                />
                {slot.url ? (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      Preço desta opção (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder={`Padrão do serviço (${basePriceReais.toFixed(2).replace(".", ",")})`}
                      value={slot.price_cents != null ? slot.price_cents / 100 : ""}
                      disabled={disabled}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          updateRow(index, { price_cents: null });
                          return;
                        }
                        const n = Number(raw.replace(",", "."));
                        if (!Number.isFinite(n) || n < 0) return;
                        updateRow(index, { price_cents: Math.round(n * 100) });
                      }}
                      className="mt-0.5 w-full h-9 text-sm bg-white border border-gray-200 rounded-lg px-3 outline-none focus:border-primary"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Vazio = mesmo preço do serviço acima.</p>
                  </div>
                ) : null}
              </div>
            </div>

            {(slot.title || slot.description) && !slot.url && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                Adicione uma foto com o ícone da câmera para esta opção aparecer na página pública.
              </p>
            )}

            {(slot.title || slot.description) && !slot.url && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  disabled={disabled || busySlot !== null}
                  onClick={() => updateRow(index, { title: "", description: "" })}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-50"
                >
                  Limpar texto
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
