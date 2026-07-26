"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { DashboardDialog } from "@/components/dashboard/dashboard-dialog";
import { getCroppedImage, createObjectURLFromFile } from "@/lib/image-crop";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

type Props = {
  imageFile: File | null;
  aspect: number;
  title: string;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
};

export function ImageCropModal({ imageFile, aspect, title, onConfirm, onCancel }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const imageSrc = useMemo(() => {
    if (!imageFile) return null;
    return createObjectURLFromFile(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageFile]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedImage(imageSrc, croppedAreaPixels, imageFile?.name ?? "cropped.jpg");
      onConfirm(file);
    } catch {
      onConfirm(imageFile!);
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, imageFile, onConfirm]);

  if (!imageFile || !imageSrc) return null;

  const footer = (
    <>
      <button
        type="button"
        disabled={processing}
        onClick={onCancel}
        className={cn(
          "min-h-11 w-full rounded-xl border px-4 text-sm font-semibold transition-colors sm:w-auto sm:min-w-[120px]",
          isDark
            ? "border-white/15 text-white hover:bg-white/5"
            : "border-gray-200 text-gray-700 hover:bg-gray-100"
        )}
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={processing || !croppedAreaPixels}
        onClick={() => void handleConfirm()}
        className="min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-bold text-on-brand-accent transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:min-w-[140px]"
      >
        {processing ? "Cortando…" : "Confirmar"}
      </button>
    </>
  );

  return (
    <DashboardDialog
      open
      title={title}
      subtitle="Arraste para posicionar e use o zoom para ajustar"
      onClose={onCancel}
      footer={footer}
      maxWidthClass="max-w-2xl"
      closeBlocked={processing}
    >
      <div className="space-y-4">
        <div
          className={cn(
            "relative w-full rounded-xl overflow-hidden",
            aspect >= 2 ? "h-[280px] sm:h-[340px]" : "h-[320px] sm:h-[380px]",
            isDark ? "bg-black/40" : "bg-gray-100"
          )}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span
            className={cn(
              "material-symbols-outlined text-base shrink-0",
              isDark ? "text-gray-500" : "text-gray-400"
            )}
          >
            photo_size_select_small
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
            aria-label="Zoom"
          />
          <span
            className={cn(
              "material-symbols-outlined text-base shrink-0",
              isDark ? "text-gray-500" : "text-gray-400"
            )}
          >
            photo_size_select_large
          </span>
        </div>
      </div>
    </DashboardDialog>
  );
}
