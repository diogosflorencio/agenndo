import type { BlogPost } from "./types";
import { seoPostsBatch } from "./seo-posts-batch";
import { seedPosts } from "./seed-posts";

const allPostsSource = [...seedPosts, ...seoPostsBatch];

export function getAllPosts(): BlogPost[] {
  return [...allPostsSource].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  return allPostsSource.find((p) => p.slug === slug) ?? null;
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter((p) => p.category === category);
}

export function getCategories(): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const post of allPostsSource) {
    map.set(post.category, (map.get(post.category) ?? 0) + 1);
  }
  return Array.from(map, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count,
  );
}
