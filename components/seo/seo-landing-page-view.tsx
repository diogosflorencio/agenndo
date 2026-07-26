import Link from "next/link";
import { buildLandingJsonLd } from "@/lib/seo/landing-json-ld";
import type { SeoLandingPageConfig } from "@/lib/seo/landing-pages/types";

export function SeoLandingPageView({ page }: { page: SeoLandingPageConfig }) {
  const jsonLd = buildLandingJsonLd(page);

  return (
    <div className="min-h-screen bg-[#020403] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="border-b border-white/5 bg-[#020403]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="font-bold tracking-tight hover:text-primary transition-colors shrink-0">
            Agenndo
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/blog" className="text-gray-400 hover:text-white hidden sm:inline">
              Blog
            </Link>
            <Link href="/login" className="text-gray-400 hover:text-white">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 sm:px-5 py-10 md:py-14">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-3">Agenndo · YWP</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">{page.h1}</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">{page.heroSubtitle}</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link
            href="/login"
            className="inline-flex justify-center items-center px-6 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/agendamento-online"
            className="inline-flex justify-center items-center px-6 py-3.5 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
          >
            Ver como funciona
          </Link>
        </div>

        {page.sections.map((section) => {
          const Tag = section.level === 2 ? "h2" : "h3";
          return (
            <section key={section.id} id={section.id} className="mb-10 scroll-mt-20">
              <Tag
                className={
                  section.level === 2
                    ? "text-xl md:text-2xl font-bold text-white mb-4"
                    : "text-lg font-semibold text-white mb-3 mt-6"
                }
              >
                {section.title}
              </Tag>
              {section.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-gray-400 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: p }}
                />
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc list-inside text-gray-400 space-y-2 mb-4 leading-relaxed">
                  {section.bullets.map((b) => (
                    <li key={b} dangerouslySetInnerHTML={{ __html: b }} />
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}

        <section className="mb-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Perguntas frequentes</h2>
          <dl className="space-y-6">
            {page.faq.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-white mb-2">{item.question}</dt>
                <dd className="text-gray-400 text-sm leading-relaxed">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        {page.relatedLinks.length > 0 ? (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-white mb-4">Leia também</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {page.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-6 md:p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Pronto para organizar sua agenda?</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Configure serviços, horários e sua página pública em poucos minutos. Seus clientes agendam 24h sem
            depender de mensagens.
          </p>
          <Link
            href="/login"
            className="inline-flex justify-center items-center px-8 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            Começar agora - é grátis para testar
          </Link>
        </section>
      </article>

      <footer className="border-t border-white/5 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-white">
            Início
          </Link>
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
          <Link href="/sobre" className="hover:text-white">
            Sobre
          </Link>
          <Link href="/termos" className="hover:text-white">
            Termos
          </Link>
          <Link href="/politicas" className="hover:text-white">
            Privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
