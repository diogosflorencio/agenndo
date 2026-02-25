"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";

const DEFAULT_FG = "#111827";
const DEFAULT_BG = "#ffffff";

type QrDotsType = "rounded" | "square" | "dots";

const QR_STYLE_OPTIONS: { value: QrDotsType; label: string }[] = [
  { value: "rounded", label: "Bolinhas" },
  { value: "square", label: "Quadrados" },
  { value: "dots", label: "Padrão" },
];

export default function QrCodePage() {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const qrInstanceRef = useRef<unknown>(null);

  const [fgColor, setFgColor] = useState(DEFAULT_FG);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);
  const [qrDotsType, setQrDotsType] = useState<QrDotsType>("rounded");
  const [topText, setTopText] = useState("Escaneie para agendar");
  const [bottomText, setBottomText] = useState("Adicione à tela inicial para acessar rápido");

  const { business } = useDashboard();
  const slug = business?.slug ?? "";
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}` : "";
  const qrDataUrl = slug ? `${baseUrl}/${slug}` : "";

  useEffect(() => {
    if (!qrContainerRef.current || !qrDataUrl || !baseUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const QRCodeStyling = (await import("qr-code-styling")).default;
        const qr = new QRCodeStyling({
          width: 260,
          height: 260,
          type: "svg",
          data: qrDataUrl,
          dotsOptions: { color: fgColor, type: qrDotsType },
          backgroundOptions: { color: bgColor },
          cornersSquareOptions: {
            type: qrDotsType === "square" ? "square" : "extra-rounded",
            color: fgColor,
          },
        });
        if (cancelled || !qrContainerRef.current) return;
        qrContainerRef.current.innerHTML = "";
        qrInstanceRef.current = qr;
        qr.append(qrContainerRef.current);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      if (qrContainerRef.current) qrContainerRef.current.innerHTML = "";
    };
  }, [qrDataUrl, baseUrl]);

  useEffect(() => {
    const qr = qrInstanceRef.current as { update?: (o: unknown) => void } | null;
    if (qr?.update) {
      qr.update({
        data: qrDataUrl,
        dotsOptions: { color: fgColor, type: qrDotsType },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: {
          type: qrDotsType === "square" ? "square" : "extra-rounded",
          color: fgColor,
        },
      });
    }
  }, [qrDataUrl, fgColor, bgColor, qrDotsType]);

  const [savingPdf, setSavingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  const captureCardAsImage = useCallback(async (): Promise<string> => {
    const el = printAreaRef.current;
    if (!el) throw new Error("No element");
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: bgColor,
      logging: false,
    });
    return canvas.toDataURL("image/png");
  }, [bgColor]);

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
      const pdfW = 100;
      const pdfH = (pdfW * img.height) / img.width;
      const pdf = new jsPDF({ unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save("qrcode-agenndo.pdf");
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPdf(false);
    }
  }, [captureCardAsImage]);

  const handlePrint = useCallback(async () => {
    try {
      setPrinting(true);
      const imgData = await captureCardAsImage();
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`
        <!DOCTYPE html><html><head><title>QR Code - ${business?.name ?? "Agenndo"}</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
          <img src="${imgData}" alt="QR Code" style="max-width:100%;height:auto;" />
        </body></html>
      `);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        w.close();
      }, 400);
    } catch (e) {
      console.error(e);
    } finally {
      setPrinting(false);
    }
  }, [captureCardAsImage]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/personalizacao"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Voltar para Personalização
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">QR Code para agendamento</h1>
        <p className="text-gray-600 text-sm mt-1">
          Gere e imprima o QR Code para seus clientes acessarem sua página de agendamento. Eles podem adicionar o site à tela inicial do celular (PWA).
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Cores</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Cor do QR</span>
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Fundo</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Estilo do QR</h3>
            <div className="flex flex-wrap gap-2">
              {QR_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQrDotsType(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    qrDotsType === opt.value
                      ? "border-primary bg-primary/10 text-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Textos no cartão</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Acima do QR</label>
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  placeholder="Ex: Escaneie para agendar"
                  className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Abaixo do QR (dica PWA)</label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="Ex: Adicione à tela inicial"
                  className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-gray-900 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              {printing ? "..." : "Imprimir"}
            </button>
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={savingPdf}
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              {savingPdf ? "..." : "Salvar PDF"}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div
            ref={printAreaRef}
            className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center w-full max-w-[320px] shadow-lg"
            style={{ backgroundColor: bgColor, borderColor: "rgba(0,0,0,0.1)" }}
          >
            {topText && (
              <p className="text-sm font-bold text-center mb-4" style={{ color: fgColor === "#111827" ? "#111827" : fgColor }}>
                {topText}
              </p>
            )}
            <div className="rounded-xl overflow-hidden bg-white flex-shrink-0">
              <div ref={qrContainerRef} className="min-h-[260px] min-w-[260px]" />
            </div>
            {bottomText && (
              <p className="text-xs font-medium text-center mt-4 max-w-[260px]" style={{ color: fgColor === "#111827" ? "#374151" : fgColor }}>
                {bottomText}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Link: {baseUrl || "..."}/{slug || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
