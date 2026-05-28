import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | Blog Agenndo",
    default:
      "Blog Agenndo - Dicas de Agendamento Online para Prestadores",
  },
  description:
    "Dicas, tutoriais e estratégias para prestadores de serviço gerenciarem melhor seus agendamentos e atraírem mais clientes.",
  alternates: {
    canonical: "https://blog.agenndo.com.br",
    languages: {
      "pt-BR": "https://blog.agenndo.com.br",
      "x-default": "https://blog.agenndo.com.br",
    },
  },
  openGraph: {
    locale: "pt_BR",
    type: "website",
    siteName: "Blog Agenndo",
  },
  twitter: {
    card: "summary_large_image",
    site: "@agenndo",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Blog Agenndo",
  description:
    "Dicas, tutoriais e estratégias para prestadores de serviço gerenciarem melhor seus agendamentos e atraírem mais clientes.",
  url: "https://blog.agenndo.com.br",
  publisher: {
    "@type": "Organization",
    name: "Agenndo",
    url: "https://agenndo.com.br",
  },
  inLanguage: "pt-BR",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-main text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-white/5">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/blog"
            className="text-lg font-semibold tracking-tight text-white hover:text-primary transition-colors"
          >
            Blog <span className="text-primary">Agenndo</span>
          </Link>
          <a
            href="https://agenndo.com.br"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Ir para o Agenndo &rarr;
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-white/5 mt-16">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-white">
                Blog <span className="text-primary">Agenndo</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Dicas de agendamento online para prestadores de serviço.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
              <a
                href="https://agenndo.com.br"
                className="hover:text-white transition-colors"
              >
                Página inicial
              </a>
              <a
                href="https://agenndo.com.br/agendamento-online"
                className="hover:text-white transition-colors"
              >
                Agendamento Online
              </a>
              <a
                href="https://agenndo.com.br/plataforma-de-agendamento-online"
                className="hover:text-white transition-colors"
              >
                Plataforma
              </a>
              <a
                href="https://agenndo.com.br/agenda-online"
                className="hover:text-white transition-colors"
              >
                Agenda online
              </a>
              <a
                href="https://agenndo.com.br/sobre"
                className="hover:text-white transition-colors"
              >
                Sobre
              </a>
              <a
                href="https://agenndo.com.br/login"
                className="hover:text-white transition-colors"
              >
                Entrar
              </a>
            </div>
          </div>
          <p className="mt-8 text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Agenndo. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
