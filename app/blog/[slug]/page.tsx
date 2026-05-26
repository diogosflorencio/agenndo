import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getPostsByCategory } from "@/lib/blog/posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `https://blog.agenndo.com.br/${post.slug}`,
      languages: {
        "pt-BR": `https://blog.agenndo.com.br/${post.slug}`,
        "x-default": `https://blog.agenndo.com.br/${post.slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      locale: "pt_BR",
      siteName: "Blog Agenndo",
      url: `https://blog.agenndo.com.br/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      site: "@agenndo",
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getPostsByCategory(post.category)
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Agenndo",
      url: "https://agenndo.com.br",
    },
    mainEntityOfPage: `https://blog.agenndo.com.br/${post.slug}`,
    inLanguage: "pt-BR",
    wordCount: Math.round(post.reading_time_min * 200),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Voltar ao blog
      </Link>

      <article>
        {/* Header */}
        <header className="mb-10">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            {post.category}
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span>{post.author}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            <span aria-hidden>·</span>
            <span>{post.reading_time_min} min de leitura</span>
          </div>
        </header>

        {/* Content */}
        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        <div className="mt-10 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </article>

      {/* CTA */}
      <section className="mt-16 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
        <h2 className="text-xl font-bold sm:text-2xl">
          Experimente o Agenndo gratuitamente
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-400">
          Crie sua página de agendamento em minutos, receba agendamentos 24h e
          reduza faltas de clientes.
        </p>
        <a
          href="https://agenndo.com.br/login"
          className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-black transition-shadow hover:shadow-primary"
        >
          Criar conta gratuita
        </a>
      </section>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-bold">Posts relacionados</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="group rounded-xl border border-white/5 bg-bg-alt p-5 transition-all hover:border-primary/20"
              >
                <span className="mb-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  {r.category}
                </span>
                <h3 className="text-sm font-semibold leading-snug text-white group-hover:text-primary transition-colors">
                  {r.title}
                </h3>
                <p className="mt-2 text-xs text-gray-500">
                  {r.reading_time_min} min de leitura
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
