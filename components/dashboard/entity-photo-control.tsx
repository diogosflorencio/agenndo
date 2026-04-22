"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { compressImageForUpload } from "@/lib/image-compress";
import {
  uploadBusinessImage,
  removeBusinessObject,
  tryRelativePathFromPublicUrl,
} from "@/lib/business-assets-storage";
import { cn } from "@/lib/utils";

function extFromFile(f: File): string {
  if (f.type === "image/png") return "png";
  if (f.type === "image/webp") return "webp";
  if (f.type === "image/gif") return "gif";
  return "jpg";
}

export type EntityPhotoKind = "collaborator" | "service";

export type EntityPhotoControlProps = {
  businessId: string;
  kind: EntityPhotoKind;
  entityId: string;
  imageUrl: string | null;
  /** Persiste URL no registro (ou null ao remover). */
  onPersist: (url: string | null) => Promise<void>;
  /** Conteúdo quando não há foto (ex.: inicial do nome ou emoji). */
  fallback: ReactNode;
  /** Cor do anel / destaque (hex). */
  accentColor?: string;
  disabled?: boolean;
  /** Tamanho visual do quadrado */
  size?: "md" | "lg";
  className?: string;
};

/**
 * Upload/remove de foto para colaborador (avatar_url) ou serviço (image_url).
 * Arquivos em `{businessId}/collaborators|services/{entityId}.{ext}`.
 */
export function EntityPhotoControl({
  businessId,
  kind,
  entityId,
  imageUrl,
  onPersist,
  fallback,
  accentColor = "#13EC5B",
  disabled,
  size = "lg",
  className,
}: EntityPhotoControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dim = size === "lg" ? "size-28" : "size-24";
  const textHint = kind === "collaborator" ? "foto do profissional" : "foto do serviço";

  const removeRemote = useCallback(
    async (url: string) => {
      const rel = tryRelativePathFromPublicUrl(url, businessId);
      if (!rel) return;
      try {
        const supabase = createClient();
        await removeBusinessObject(supabase, businessId, rel);
      } catch {
        /* arquivo pode já ter sido substituído */
      }
    },
    [businessId]
  );

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled || busy) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await compressImageForUpload(file);
      const ext = extFromFile(prepared);
      const folder = kind === "collaborator" ? "collaborators" : "services";
      const relativePath = `${folder}/${entityId}.${ext}`;

      if (imageUrl) await removeRemote(imageUrl);

      const supabase = createClient();
      const publicUrl = await uploadBusinessImage(supabase, businessId, relativePath, prepared);
      await onPersist(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl || disabled || busy) return;
    setError(null);
    setBusy(true);
    try {
      await removeRemote(imageUrl);
      await onPersist(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative group">
        <div
          className={cn(
            dim,
            "rounded-2xl overflow-hidden border-2 shadow-md transition-all bg-gray-50",
            imageUrl ? "border-gray-200" : "border-dashed border-gray-300",
            !disabled && "group-hover:border-primary/50 group-hover:shadow-lg"
          )}
          style={imageUrl ? undefined : { borderColor: `${accentColor}55` }}
        >
          {imageUrl ? (
            <Image src={imageUrl} alt="" width={112} height={112} className="size-full object-cover" unoptimized />
          ) : (
            <div className="size-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
              {fallback}
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="size-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {!disabled && (
          <div className="absolute -bottom-1 -right-1 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              title={imageUrl ? "Trocar foto" : "Adicionar foto"}
              className="size-9 rounded-xl bg-primary text-black shadow-lg border-2 border-white flex items-center justify-center hover:brightness-95 disabled:opacity-50 transition-transform hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">
                {imageUrl ? "photo_camera" : "add_a_photo"}
              </span>
            </button>
            {imageUrl ? (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={busy}
                title="Remover foto"
                className="size-9 rounded-xl bg-white text-red-600 shadow-lg border-2 border-gray-200 flex items-center justify-center hover:bg-red-50 disabled:opacity-50 transition-transform hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            ) : null}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(ev) => void handlePick(ev)}
        />
      </div>

      <p className="mt-3 text-center text-xs text-gray-500 max-w-[220px] leading-relaxed">
        {imageUrl
          ? "Foto visível na página pública de agendamento. JPG, PNG ou WebP até 12 MB (comprimida antes do envio)."
          : `Sem foto, usamos a letra ou o ícone. Toque em + para enviar a ${textHint}.`}
      </p>

      {error && (
        <p className="mt-2 text-center text-xs text-red-600 max-w-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
