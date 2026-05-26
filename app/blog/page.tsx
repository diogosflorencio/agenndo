import Link from "next/link";
import { getAllPosts, getCategories } from "@/lib/blog/posts";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const allPosts = getAllPosts();
  const categories = getCategories();
  const posts = categoria
    ? allPosts.filter((p) => p.category === categoria)
    : allPosts;

  return (
    <>
      <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Blog <span className="text-primary">Agenndo</span>
        </h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Dicas e estratégias de agendamento online para prestadores de serviço
        </p>
      </section>

      {/* Category filter */}
      <div className="mb-10 flex flex-wrap gap-2">
        <Link
          href="/blog"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !categoria
              ? "bg-primary text-black"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          Todos
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href={`/blog?categoria=${encodeURIComponent(cat.name)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              categoria === cat.name
                ? "bg-primary text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {cat.name}{" "}
            <span className="opacity-60">({cat.count})</span>
          </Link>
        ))}
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <p className="text-gray-500">Nenhum post encontrado.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-white/5 bg-bg-alt p-6 transition-all hover:border-primary/20 hover:shadow-card-hover"
            >
              <span className="mb-3 inline-flex w-fit rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                {post.category}
              </span>
              <h2 className="text-lg font-semibold leading-snug text-white group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
                <time dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                <span aria-hidden>·</span>
                <span>{post.reading_time_min} min de leitura</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
