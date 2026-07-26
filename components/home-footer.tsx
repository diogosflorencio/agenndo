import Image from "next/image";
import Link from "next/link";

const SOCIAL = [
  { href: "https://www.facebook.com/ywpoficial", label: "Facebook", icon: "public" },
  { href: "https://www.instagram.com/ywpoficial", label: "Instagram", icon: "photo_camera" },
  { href: "https://www.youtube.com/@ywpoficial", label: "YouTube", icon: "play_circle" },
  { href: "https://www.linkedin.com/company/ywpoficial", label: "LinkedIn", icon: "work" },
] as const;

export function HomeFooter({ tagline }: { tagline: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative text-white">
      <div
        className="w-full overflow-hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 8%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%)",
        }}
      >
        <div className="w-full aspect-[1] sm:aspect-[3/2] min-[940px]:aspect-[2.2] min-[1400px]:aspect-[1920/400] relative">
          <Image
            src="/footer/footer_pc.webp"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            loading="lazy"
            aria-hidden
          />
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col justify-end pb-8 sm:pb-12 md:pb-16 pointer-events-none">
        <div className="max-w-6xl relative z-10 mx-auto px-4 sm:px-6 w-full pointer-events-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold mb-2">Agenndo</h3>
              <p className="text-sm text-white/90 mb-4 max-w-xs">{tagline}</p>
              <div className="flex gap-4 justify-center sm:justify-start">
                {SOCIAL.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-white transition-colors"
                    aria-label={s.label}
                  >
                    <span className="material-symbols-outlined text-xl">{s.icon}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 sm:gap-3">
              <span className="font-bold leading-none text-[56px] sm:text-[50px] tracking-tight">YWP</span>
              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-end mt-1">
                <Link href="/termos" className="text-sm text-white/90 hover:text-white transition-colors">
                  Termos
                </Link>
                <Link href="/politicas" className="text-sm text-white/90 hover:text-white transition-colors">
                  Privacidade
                </Link>
                <Link href="/sobre" className="text-sm text-white/90 hover:text-white transition-colors">
                  Sobre
                </Link>
                <Link href="/blog" className="text-sm text-white/90 hover:text-white transition-colors">
                  Blog
                </Link>
                <a
                  href="mailto:ywp.company@gmail.com"
                  className="text-sm text-white/90 hover:text-white transition-colors"
                >
                  Contato
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 sm:pt-8 border-t border-white/20 text-center">
            <p className="text-xs sm:text-sm text-white/80">
              © 2024-{year} Agenndo · YWP (YourWebPlace). Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
