"use client";

import { useRef, useEffect, useState, useCallback, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Printer, FileDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "agenndo-personalizacao-qrcode-v1";

const DEFAULT_FG = "#111827";
const DEFAULT_BG = "#ffffff";

type QrDotsType = "rounded" | "square" | "dots" | "classy" | "classy-rounded" | "extra-rounded";

const QR_STYLE_OPTIONS: { value: QrDotsType; label: string; preview: string }[] = [
  { value: "rounded", label: "Bolinhas", preview: "●" },
  { value: "square", label: "Quadrados", preview: "■" },
  { value: "dots", label: "Padrão", preview: "•" },
  { value: "classy", label: "Clássico", preview: "◆" },
  { value: "classy-rounded", label: "Cláss. arred.", preview: "◉" },
  { value: "extra-rounded", label: "Extra arred.", preview: "⬤" },
];

const PRESET_PALETTES_BASE = [
  { name: "Ink", fg: "#111827", bg: "#ffffff" },
  { name: "Night", fg: "#e2e8f0", bg: "#0f172a" },
  { name: "Mint", fg: "#14532d", bg: "#ecfdf5" },
  { name: "Ocean", fg: "#1e3a5f", bg: "#eff6ff" },
  { name: "Ember", fg: "#7c2d12", bg: "#fff7ed" },
  { name: "Violet", fg: "#3b0764", bg: "#faf5ff" },
  { name: "Rose", fg: "#881337", bg: "#fff1f2" },
  { name: "Slate", fg: "#1e293b", bg: "#f8fafc" },
];

function hexToLuminance(hex: string): number {
  const h = hex.replace(/^#/, "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getContrastColor(bgHex: string): string {
  return hexToLuminance(bgHex) < 0.45 ? "#ffffff" : "#111827";
}

export type PersonalizationShareQrProps = {
  publicUrl: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  logoUrl: string | null;
  /** Cor da marca — usada como sugestão inicial da paleta “Marca” e cor do QR ao carregar */
  primaryColor: string;
  /** Em `lg`, a pré-visualização do cartão/QR é renderizada neste elemento (coluna lateral). Em telas menores, fica inline. */
  desktopPreviewHost?: HTMLElement | null;
};

export function PersonalizationShareQr({
  publicUrl,
  slug,
  businessName,
  tagline,
  logoUrl,
  primaryColor,
  desktopPreviewHost,
}: PersonalizationShareQrProps) {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const qrInstanceRef = useRef<{
    append: (el: HTMLElement) => void;
    update: (o: Record<string, unknown>) => void;
  } | null>(null);

  const [fgColor, setFgColor] = useState(DEFAULT_FG);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);
  const [qrDotsType, setQrDotsType] = useState<QrDotsType>("rounded");
  const [showLogoInQr, setShowLogoInQr] = useState(true);
  const [logoSize, setLogoSize] = useState(0.35);
  const [topText, setTopText] = useState("Escaneie para agendar");
  const [bottomText, setBottomText] = useState("Garanta sua vez. Agende sempre!");
  const [cardRadius, setCardRadius] = useState(20);
  const [cardPadding, setCardPadding] = useState(24);

  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [isLg, setIsLg] = useState(false);

  const qrDataUrl = publicUrl;
  const hostLabel = typeof window !== "undefined" ? window.location.host : "agenndo.com.br";
  const textOnCard = getContrastColor(bgColor);

  const presetPalettes = useMemo(() => {
    const pc = (primaryColor ?? "").trim();
    const brandFg = /^#[0-9A-Fa-f]{6}$/i.test(pc) ? pc : DEFAULT_FG;
    return [{ name: "Marca", fg: brandFg, bg: "#ffffff" }, ...PRESET_PALETTES_BASE];
  }, [primaryColor]);

  const fetchImageAsBase64 = useCallback(async (url: string): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    try {
      const res = await fetch(url, { mode: "cors", cache: "no-store" });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      /* CORS / rede */
    }
    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || 256;
          c.height = img.naturalHeight || 256;
          c.getContext("2d")?.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  useEffect(() => {
    if (!logoUrl) {
      setLogoBase64(null);
      return;
    }
    void fetchImageAsBase64(logoUrl).then(setLogoBase64);
  }, [logoUrl, fetchImageAsBase64]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const pc = primaryColor?.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(pc)) {
          setFgColor(pc);
          setBgColor("#ffffff");
        }
        setStorageLoaded(true);
        return;
      }
      const s = JSON.parse(raw) as Record<string, unknown>;
      if (typeof s.fgColor === "string") setFgColor(s.fgColor);
      if (typeof s.bgColor === "string") setBgColor(s.bgColor);
      if (typeof s.showLogoInQr === "boolean") setShowLogoInQr(s.showLogoInQr);
      if (typeof s.logoSize === "number") setLogoSize(s.logoSize);
      if (typeof s.topText === "string") setTopText(s.topText);
      if (typeof s.bottomText === "string") setBottomText(s.bottomText);
      if (typeof s.cardRadius === "number") setCardRadius(s.cardRadius);
      if (typeof s.cardPadding === "number") setCardPadding(s.cardPadding);
      if (QR_STYLE_OPTIONS.some((o) => o.value === s.qrDotsType)) setQrDotsType(s.qrDotsType as QrDotsType);
    } catch {
      /* ignore */
    }
    setStorageLoaded(true);
  }, [primaryColor]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsLg(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!storageLoaded || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fgColor,
          bgColor,
          showLogoInQr,
          logoSize,
          topText,
          bottomText,
          cardRadius,
          cardPadding,
          qrDotsType,
        })
      );
    } catch {
      /* quota */
    }
  }, [
    storageLoaded,
    fgColor,
    bgColor,
    showLogoInQr,
    logoSize,
    topText,
    bottomText,
    cardRadius,
    cardPadding,
    qrDotsType,
  ]);

  const buildQr = useCallback(
    async (
      QRCodeStyling: new (o: Record<string, unknown>) => {
        append: (el: HTMLElement) => void;
        update: (o: Record<string, unknown>) => void;
      },
      imageBase64: string | undefined
    ) => {
      return new QRCodeStyling({
        width: 220,
        height: 220,
        type: "svg",
        data: qrDataUrl,
        dotsOptions: { color: fgColor, type: qrDotsType },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: {
          type: qrDotsType === "square" ? "square" : "extra-rounded",
          color: fgColor,
        },
        cornersDotOptions: { color: fgColor },
        imageOptions: {
          margin: 6,
          imageSize: logoSize,
          hideBackgroundDots: true,
        },
        ...(imageBase64 ? { image: imageBase64 } : {}),
      });
    },
    [qrDataUrl, fgColor, bgColor, qrDotsType, logoSize]
  );

  useEffect(() => {
    if (!qrContainerRef.current || !qrDataUrl || !slug) return;

    setQrReady(false);
    qrInstanceRef.current = null;
    let cancelled = false;

    void (async () => {
      const imageBase64 = showLogoInQr && logoBase64 ? logoBase64 : undefined;
      const { default: QRCodeStyling } = await import("qr-code-styling");
      if (cancelled) return;

      const qr = await buildQr(QRCodeStyling, imageBase64);
      if (cancelled || !qrContainerRef.current) return;

      qrContainerRef.current.innerHTML = "";
      qrInstanceRef.current = qr;
      qr.append(qrContainerRef.current);

      window.setTimeout(() => {
        if (cancelled) return;
        const svgEl = qrContainerRef.current?.querySelector("svg");
        const isEmpty = !svgEl || svgEl.innerHTML.trim() === "";
        if (isEmpty && imageBase64) {
          qrContainerRef.current!.innerHTML = "";
          void buildQr(QRCodeStyling, undefined).then((qr2) => {
            if (cancelled || !qrContainerRef.current) return;
            qrContainerRef.current.innerHTML = "";
            qrInstanceRef.current = qr2;
            qr2.append(qrContainerRef.current);
            window.setTimeout(() => {
              if (!cancelled) setQrReady(true);
            }, 150);
          });
        } else {
          setQrReady(true);
        }
      }, 350);
    })();

    return () => {
      cancelled = true;
      if (qrContainerRef.current) qrContainerRef.current.innerHTML = "";
    };
  }, [qrDataUrl, slug, fgColor, bgColor, showLogoInQr, logoBase64, qrDotsType, logoSize, buildQr]);

  useEffect(() => {
    const qr = qrInstanceRef.current;
    if (!qr?.update || !qrReady) return;
    qr.update({
      data: qrDataUrl,
      dotsOptions: { color: fgColor, type: qrDotsType },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: {
        type: qrDotsType === "square" ? "square" : "extra-rounded",
        color: fgColor,
      },
      cornersDotOptions: { color: fgColor },
    });
  }, [qrDataUrl, fgColor, bgColor, qrDotsType, qrReady]);

  const captureCardAsImage = useCallback(async (): Promise<string> => {
    const el = printAreaRef.current;
    if (!el) throw new Error("No element");

    const imgEls = el.querySelectorAll<HTMLImageElement>("img");
    const restoreList: Array<{ el: HTMLImageElement; original: string }> = [];

    await Promise.all(
      Array.from(imgEls).map(async (imgEl) => {
        const src = imgEl.getAttribute("data-external-src") || imgEl.src;
        if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
        const b64 = await fetchImageAsBase64(src);
        if (b64) {
          restoreList.push({ el: imgEl, original: imgEl.src });
          imgEl.src = b64;
        }
      })
    );

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: false,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      foreignObjectRendering: false,
    });

    restoreList.forEach(({ el: node, original }) => {
      node.src = original;
    });

    return canvas.toDataURL("image/png", 1.0);
  }, [fetchImageAsBase64]);

  const handleSavePdf = useCallback(async () => {
    try {
      setSavingPdf(true);
      const imgData = await captureCardAsImage();
      const { jsPDF } = await import("jspdf");
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = imgData;
      });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = 210;
      const pageH = 297;
      const cardW = 90;
      const cardH = (cardW * img.height) / img.width;
      const x = (pageW - cardW) / 2;
      const y = (pageH - cardH) / 2;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.setFillColor(235, 235, 235);
      pdf.roundedRect(x + 1.5, y + 2, cardW, cardH, 4, 4, "F");
      pdf.addImage(imgData, "PNG", x, y, cardW, cardH, undefined, "FAST");
      pdf.setFontSize(8);
      pdf.setTextColor(160, 160, 160);
      pdf.text(hostLabel, pageW / 2, pageH - 10, { align: "center" });
      pdf.save(`qrcode-${slug || "agenndo"}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPdf(false);
    }
  }, [captureCardAsImage, hostLabel, slug]);

  const handlePrint = useCallback(async () => {
    try {
      setPrinting(true);
      const imgData = await captureCardAsImage();
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<!DOCTYPE html><html><head>
        <title>QR Code — ${businessName || "Agenndo"}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { display: flex; flex-direction: column; align-items: center;
                 justify-content: center; min-height: 100vh; background: #fff;
                 font-family: system-ui, sans-serif; }
          .wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
          img { width: 90mm; height: auto; border-radius: 8px;
                box-shadow: 0 4px 32px rgba(0,0,0,0.12); display: block; }
          .footer { font-size: 11px; color: #999; margin-top: 8px; letter-spacing: 0.05em; }
        </style></head>
        <body><div class="wrap">
          <img src="${imgData}" alt="QR Code" />
          <div class="footer">${hostLabel}</div>
        </div></body></html>`);
      w.document.close();
      w.focus();
      window.setTimeout(() => {
        w.print();
        w.close();
      }, 500);
    } catch (e) {
      console.error(e);
    } finally {
      setPrinting(false);
    }
  }, [captureCardAsImage, businessName, hostLabel]);

  const handleCopyLink = useCallback(() => {
    if (!qrDataUrl) return;
    void navigator.clipboard.writeText(qrDataUrl).then(() => {
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 2000);
    });
  }, [qrDataUrl]);

  if (!slug) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">link_off</span>
          <p className="text-sm text-gray-600">
            Defina o <strong className="text-gray-900">slug</strong> do seu negócio para gerar o QR Code da página pública.
          </p>
        </div>
      </div>
    );
  }

  const usePortalPreview = Boolean(isLg && desktopPreviewHost);

  const previewSection = (
    <div className="shrink-0 flex flex-col items-center w-full max-w-[300px] mx-auto lg:mx-0">
      {!usePortalPreview && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 w-full text-center">
          Pré-visualização
        </p>
      )}
      <div
        ref={printAreaRef}
        className="relative flex flex-col items-center w-full max-w-[300px] overflow-hidden border border-gray-200 shadow-md"
        style={{
          borderRadius: cardRadius,
          padding: cardPadding,
          backgroundColor: bgColor,
        }}
      >
        <div className="relative z-10 flex flex-col items-center w-full gap-1">
          <div className="flex flex-col items-center mb-2 w-full">
            {logoUrl ? (
              <img
                src={logoBase64 ?? logoUrl}
                data-external-src={logoUrl}
                alt=""
                className="w-14 h-14 rounded-full object-cover mb-2 border-2 shadow-sm"
                style={{ borderColor: `${fgColor}33` }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold mb-2 border-2 shadow-sm"
                style={{
                  backgroundColor: `${primaryColor}22`,
                  color: primaryColor,
                  borderColor: `${fgColor}33`,
                }}
              >
                {businessName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="font-bold text-center text-sm leading-tight px-1" style={{ color: textOnCard }}>
              {businessName}
            </span>
            {tagline ? (
              <span className="text-[11px] text-center mt-0.5 opacity-75 px-2" style={{ color: textOnCard }}>
                {tagline}
              </span>
            ) : null}
            {topText ? (
              <span className="text-[11px] text-center mt-1 opacity-80" style={{ color: textOnCard }}>
                {topText}
              </span>
            ) : null}
          </div>

          <div
            className="rounded-xl overflow-hidden shadow-inner flex items-center justify-center"
            style={{ background: bgColor }}
          >
            <div ref={qrContainerRef} className="w-[220px] h-[220px] flex items-center justify-center" />
          </div>

          {bottomText ? (
            <p
              className="mt-3 text-center text-xs font-medium leading-snug max-w-[240px] px-1"
              style={{ color: textOnCard, opacity: 0.9 }}
            >
              {bottomText}
            </p>
          ) : null}

          <p
            className="mt-3 pt-2 w-full border-t text-center text-[10px] opacity-40 tracking-wide"
            style={{ color: textOnCard, borderColor: `${textOnCard}22` }}
          >
            {hostLabel}/{slug}
          </p>
        </div>
      </div>
      {!qrReady && <p className="text-[11px] text-gray-400 mt-2">Gerando QR…</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
            <QrCode className="size-5 text-gray-800" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">QR Code para agendar</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Personalize cores e módulos do QR, copie o link, imprima ou exporte PDF em A4.
            </p>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Paletas rápidas</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {presetPalettes.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    title={p.name}
                    onClick={() => {
                      setFgColor(p.fg);
                      setBgColor(p.bg);
                    }}
                    className={cn(
                      "relative aspect-square rounded-xl border-2 transition-all overflow-hidden",
                      fgColor === p.fg && bgColor === p.bg ? "border-primary ring-2 ring-primary/25" : "border-gray-200 hover:border-gray-300"
                    )}
                    style={{ background: p.bg }}
                  >
                    <div className="absolute inset-2 grid grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-[1px]"
                          style={{
                            background: [0, 2, 4, 6, 8].includes(i) ? p.fg : "transparent",
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Cor do QR</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-9 h-9 rounded-lg border border-gray-200 overflow-hidden shrink-0 shadow-sm"
                    style={{ background: fgColor }}
                  >
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 truncate">{fgColor}</span>
                </label>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Fundo do cartão</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-9 h-9 rounded-lg border border-gray-200 overflow-hidden shrink-0 shadow-sm"
                    style={{ background: bgColor }}
                  >
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 truncate">{bgColor}</span>
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estilo dos módulos</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {QR_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQrDotsType(opt.value)}
                    className={cn(
                      "px-2 py-2 rounded-xl border text-[11px] font-medium transition-all flex flex-col items-center gap-0.5",
                      qrDotsType === opt.value
                        ? "border-primary bg-primary/10 text-gray-900"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <span className="text-base leading-none">{opt.preview}</span>
                    <span className="leading-tight text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
              <span className="text-sm text-gray-700">Logo no centro do QR</span>
              <input
                type="checkbox"
                checked={showLogoInQr}
                onChange={() => setShowLogoInQr((v) => !v)}
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>
            {showLogoInQr && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">Tamanho da logo no QR</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.2}
                    max={0.5}
                    step={0.05}
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-primary"
                  />
                  <span className="text-xs text-gray-500 w-10 text-right">{Math.round(logoSize * 100)}%</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Arredondamento do cartão</label>
                <input
                  type="range"
                  min={8}
                  max={32}
                  value={cardRadius}
                  onChange={(e) => setCardRadius(Number(e.target.value))}
                  className="w-full h-1.5 accent-primary"
                />
                <span className="text-[10px] text-gray-400">{cardRadius}px</span>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Espaço interno</label>
                <input
                  type="range"
                  min={12}
                  max={40}
                  value={cardPadding}
                  onChange={(e) => setCardPadding(Number(e.target.value))}
                  className="w-full h-1.5 accent-primary"
                />
                <span className="text-[10px] text-gray-400">{cardPadding}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Texto acima do QR</label>
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-gray-900 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Texto abaixo do QR</label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-gray-900 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-mono text-gray-600 flex-1 truncate">{qrDataUrl}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 font-semibold text-gray-800 flex items-center gap-1"
              >
                <AnimatePresence mode="wait">
                  {justCopied ? (
                    <motion.span
                      key="ok"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.8 }}
                      className="flex items-center gap-1 text-green-600"
                    >
                      <Check className="size-3.5" />
                      OK
                    </motion.span>
                  ) : (
                    <motion.span key="cp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Copiar
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void handlePrint()}
                disabled={printing || !qrReady}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-45"
              >
                <Printer className="size-4 shrink-0" />
                {printing ? "Preparando…" : "Imprimir"}
              </button>
              <button
                type="button"
                onClick={() => void handleSavePdf()}
                disabled={savingPdf || !qrReady}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-45"
              >
                <FileDown className="size-4 shrink-0" />
                {savingPdf ? "Gerando…" : "Salvar PDF"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              PDF em A4 · Export em alta resolução (as imagens são convertidas no navegador para evitar erro de captura)
            </p>

          {!usePortalPreview && (
            <div className="border-t border-gray-100 pt-4 lg:hidden">{previewSection}</div>
          )}
        </div>
      </div>

      {usePortalPreview && desktopPreviewHost ? createPortal(previewSection, desktopPreviewHost) : null}
    </div>
  );
}
