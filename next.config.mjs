/** @type {import('next').NextConfig} */
const nextConfig = {
  // distDir absoluto em outro disco NÃO funciona no Next (path.join quebra no Windows).
  // Junction .next → AppData é opt-in (AGENNDO_LOCAL_NEXT_DIST=1): em drive Z: com node_modules no Z:,
  // server bundles em C:\ não resolvem `require('next/...')` → 404 nas API routes. Padrão: .next no projeto.
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
