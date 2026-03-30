/**
 * Compressão no cliente antes do upload: imagens muito pequenas quase intactas;
 * médias com redimensionamento leve; grandes (≥1 MB) mais agressivas.
 * GIF não é reprocessado (preserva animação).
 */

const MAX_INPUT_BYTES = 5 * 1024 * 1024;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar JPEG."));
      },
      "image/jpeg",
      quality
    );
  });
}

function baseName(file: File): string {
  const n = file.name.replace(/\.[^.]+$/, "");
  return n || "imagem";
}

/**
 * @returns File pronto para upload (JPEG na maioria dos casos; GIF original).
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo não é imagem.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Arquivo muito grande (máx. 5 MB).");
  }
  if (file.type === "image/gif") {
    return file;
  }

  // Já leve: evita reencode desnecessário
  if (file.size <= 90 * 1024) {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    return file;
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return file;

  let maxDim = 1920;
  let quality = 0.88;

  if (file.size >= 1024 * 1024) {
    maxDim = 1280;
    quality = 0.7;
  } else if (file.size >= 350 * 1024) {
    maxDim = 1680;
    quality = 0.8;
  } else {
    // ~90 KB – 350 KB: leve
    maxDim = 1920;
    quality = 0.9;
  }

  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, tw, th);

  let blob: Blob;
  try {
    blob = await canvasToJpegBlob(canvas, quality);
  } catch {
    return file;
  }

  if (blob.size >= file.size * 0.95 && file.size < 400 * 1024) {
    return file;
  }

  const out = new File([blob], `${baseName(file)}.jpg`, { type: "image/jpeg" });
  if (out.size > MAX_INPUT_BYTES) {
    const blob2 = await canvasToJpegBlob(canvas, Math.max(0.5, quality - 0.15));
    return new File([blob2], `${baseName(file)}.jpg`, { type: "image/jpeg" });
  }
  return out;
}
