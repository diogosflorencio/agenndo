/**
 * Compressão no cliente antes do upload (canvas → JPEG).
 *
 * Metas aproximadas do arquivo final:
 * - ~3 MB → ~500 KB
 * - ~5–12 MB → ~1 MB
 * - GIFs grandes (> ~900 KB) viram JPEG (primeiro quadro) para caber no bucket.
 */

const MB = 1024 * 1024;
const KB = 1024;

/** Tamanho máximo do arquivo que o usuário pode escolher (antes de processar). */
const MAX_INPUT_BYTES = 12 * MB;

/** Teto do arquivo enviado ao storage (após compressão). */
export const MAX_COMPRESSED_OUTPUT_BYTES = Math.floor(1.25 * MB);

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
 * Meta de tamanho (bytes) para o JPEG final, a partir do arquivo original.
 */
function targetOutputBytes(inputSize: number): number {
  if (inputSize <= 100 * KB) return Math.min(inputSize, 90 * KB);
  if (inputSize <= 220 * KB) return 200 * KB;
  if (inputSize <= 450 * KB) return 320 * KB;
  if (inputSize < 900 * KB) return 380 * KB;
  if (inputSize < 2.2 * MB) return 480 * KB;
  if (inputSize < 4.5 * MB) return 560 * KB;
  return MB;
}

const QUALITIES_DESC = [0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.48, 0.44, 0.4, 0.36, 0.34];

export type CompressImageOptions = {
  /** Maior lado máximo em pixels (padrão 2048). Galeria pública usa valor menor para reduzir peso. */
  maxLongEdge?: number;
};

/**
 * Redimensiona + reencode JPEG até ficar ≤ targetMax (e ≤ MAX_COMPRESSED_OUTPUT_BYTES).
 */
async function rasterToJpegUnderTarget(
  img: HTMLImageElement,
  file: File,
  targetMax: number,
  maxLongCap = 2048
): Promise<File> {
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error("Dimensões inválidas.");

  const hardCap = Math.min(targetMax, MAX_COMPRESSED_OUTPUT_BYTES);
  let bestBlob: Blob | null = null;
  let bestSize = Infinity;

  let maxLong = Math.min(maxLongCap, Math.max(w0, h0));

  while (maxLong >= 360) {
    const scale = Math.min(1, maxLong / Math.max(w0, h0));
    const tw = Math.max(1, Math.round(w0 * scale));
    const th = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    ctx.drawImage(img, 0, 0, tw, th);

    for (const q of QUALITIES_DESC) {
      const blob = await canvasToJpegBlob(canvas, q);
      if (blob.size < bestSize) {
        bestSize = blob.size;
        bestBlob = blob;
      }
      if (blob.size <= hardCap) {
        return new File([blob], `${baseName(file)}.jpg`, { type: "image/jpeg" });
      }
    }

    maxLong = Math.round(maxLong * 0.85);
  }

  if (!bestBlob) throw new Error("Falha ao comprimir a imagem.");

  const squeeze = async (longEdge: number, qs: number[]) => {
    const scale = Math.min(1, longEdge / Math.max(w0, h0));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let smallest = bestBlob!;
    for (const q of qs) {
      const blob = await canvasToJpegBlob(canvas, q);
      if (blob.size <= MAX_COMPRESSED_OUTPUT_BYTES) {
        return blob;
      }
      if (blob.size < smallest.size) smallest = blob;
    }
    return smallest;
  };

  if (bestBlob.size > MAX_COMPRESSED_OUTPUT_BYTES) {
    const b320 = await squeeze(320, [0.4, 0.34, 0.3]);
    if (b320.size <= MAX_COMPRESSED_OUTPUT_BYTES) {
      return new File([b320], `${baseName(file)}.jpg`, { type: "image/jpeg" });
    }
    bestBlob = b320;
  }

  if (bestBlob.size > MAX_COMPRESSED_OUTPUT_BYTES) {
    const b256 = await squeeze(256, [0.34, 0.28, 0.24]);
    if (b256.size <= MAX_COMPRESSED_OUTPUT_BYTES) {
      return new File([b256], `${baseName(file)}.jpg`, { type: "image/jpeg" });
    }
    bestBlob = b256;
  }

  return new File([bestBlob], `${baseName(file)}.jpg`, { type: "image/jpeg" });
}

/**
 * @returns File pronto para upload (JPEG na maioria dos casos; GIF pequeno intacto).
 */
export async function compressImageForUpload(file: File, options?: CompressImageOptions): Promise<File> {
  const maxLongCap = options?.maxLongEdge ?? 2048;

  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo não é imagem.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Arquivo muito grande (máx. 12 MB).");
  }

  if (file.type === "image/gif") {
    if (file.size <= 900 * KB) {
      return file;
    }
    const img = await loadImageFromFile(file);
    const target = targetOutputBytes(file.size);
    return rasterToJpegUnderTarget(img, file, target, maxLongCap);
  }

  if (file.size <= 72 * KB && file.type === "image/jpeg" && maxLongCap >= 2048) {
    return file;
  }

  const img = await loadImageFromFile(file);
  const target = targetOutputBytes(file.size);

  if (file.size <= 120 * KB && maxLongCap >= 2048) {
    try {
      const out = await rasterToJpegUnderTarget(img, file, Math.min(target, file.size), maxLongCap);
      if (out.size >= file.size * 0.94) {
        return file;
      }
      return out;
    } catch {
      return file;
    }
  }

  return rasterToJpegUnderTarget(img, file, target, maxLongCap);
}
