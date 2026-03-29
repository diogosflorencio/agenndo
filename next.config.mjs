/** @type {import('next').NextConfig} */
const nextConfig = {
  // distDir absoluto em outro disco NÃO funciona: o Next faz path.join(projeto, distDir) e no Windows
  // vira Z:\projeto\C:\Users\... Use scripts/ensure-next-on-local-disk.mjs (predev/prebuild) + junction em .next.
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },
  // Supabase fora do bundle do servidor evita referências quebradas a vendor-chunks (comum com .next incompleto / rede).
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  },
  // Evita cache webpack em disco no dev (comum falhar em drive de rede → 404 em /_next/static).
  webpack: (config, { dev }) => {
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
