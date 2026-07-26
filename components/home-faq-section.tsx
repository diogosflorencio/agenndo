"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { HOME_FAQS } from "@/lib/seo/home-faq-data";
import { cn } from "@/lib/utils";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_AGENNDO_SUPPORT_WHATSAPP?.replace(/\D/g, "") || "5513981740870";

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Tenho interesse no Agenndo e gostaria de mais informações."
)}`;

function FaqColumn({
  items,
  openIndex,
  indexOffset,
  onToggle,
}: {
  items: readonly { q: string; a: string }[];
  openIndex: number | null;
  indexOffset: number;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="divide-y divide-gray-200 border-t border-gray-200">
      {items.map((faq, i) => {
        const idx = indexOffset + i;
        const open = openIndex === idx;
        return (
          <article key={faq.q}>
            <button
              type="button"
              onClick={() => onToggle(open ? -1 : idx)}
              className="w-full py-4 text-left flex items-start justify-between gap-4 group"
              aria-expanded={open}
            >
              <span className="font-medium text-gray-900 text-[15px] leading-snug group-hover:text-gray-700 pr-2">
                {faq.q}
              </span>
              <span className={cn("text-gray-400 text-lg shrink-0 leading-none", open && "text-gray-800")}>
                {open ? "-" : "+"}
              </span>
            </button>
            {open ? <p className="pb-4 text-sm text-gray-600 leading-relaxed pr-6">{faq.a}</p> : null}
          </article>
        );
      })}
    </div>
  );
}

export function HomeFaqSection() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const mid = Math.ceil(HOME_FAQS.length / 2);
  const left = HOME_FAQS.slice(0, mid);
  const right = HOME_FAQS.slice(mid);

  return (
    <section id="faq" className="py-16 md:py-20 bg-white px-4 sm:px-6 scroll-mt-16 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight mb-2">Perguntas frequentes</h2>
        <p className="text-gray-600 text-sm md:text-base mb-10 max-w-xl">
          Trial, página pública, pagamentos, equipe e cancelamento.
        </p>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-0">
          <FaqColumn items={left} openIndex={openIndex} indexOffset={0} onToggle={(i) => setOpenIndex(i < 0 ? null : i)} />
          <FaqColumn items={right} openIndex={openIndex} indexOffset={mid} onToggle={(i) => setOpenIndex(i < 0 ? null : i)} />
        </div>

        <p className="mt-10 pt-8 border-t border-gray-100 text-sm text-gray-500">
          {t("landing.faq.whatsappHint")}{" "}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-800 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500"
          >
            {t("landing.faq.whatsappLink")}
          </a>
        </p>
      </div>
    </section>
  );
}
