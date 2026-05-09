"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppAlert } from "@/components/app-alert-provider";

export type DashboardPageGuard = {
  dirty: boolean;
  /** Deve retornar true se salvou com sucesso (permite navegar depois de “Salvar”). */
  save: () => Promise<boolean>;
};

function normalizePath(p: string) {
  if (!p) return "/";
  const t = p.replace(/\/+$/, "");
  return t === "" ? "/" : t;
}

function pathsEqual(a: string, b: string) {
  return normalizePath(a) === normalizePath(b);
}

type GuardContextValue = {
  guardRef: React.MutableRefObject<DashboardPageGuard | null>;
};

const DashboardNavigationGuardContext = createContext<GuardContextValue | null>(null);

export function DashboardNavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<DashboardPageGuard | null>(null);
  const value = useMemo(() => ({ guardRef }), []);
  return (
    <DashboardNavigationGuardContext.Provider value={value}>{children}</DashboardNavigationGuardContext.Provider>
  );
}

/**
 * Registra alterações não salvas da página atual. Ao navegar pelo menu, o usuário é perguntado (salvar / descartar / continuar).
 */
export function useRegisterDashboardUnsavedNavigation(
  dirty: boolean,
  save: () => Promise<boolean>,
  enabled = true
) {
  const ctx = useContext(DashboardNavigationGuardContext);
  useEffect(() => {
    if (!ctx || !enabled) {
      if (ctx) ctx.guardRef.current = null;
      return;
    }
    ctx.guardRef.current = { dirty, save };
    return () => {
      ctx.guardRef.current = null;
    };
  }, [ctx, dirty, enabled, save]);

  useEffect(() => {
    if (!dirty || !enabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, enabled]);
}

type GuardedLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Link interno do dashboard que respeita `useRegisterDashboardUnsavedNavigation`.
 * Use no lugar de `Link` para itens do menu / navegação principal.
 */
export function GuardedDashboardLink({ href, onClick, children, ...rest }: GuardedLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const ctx = useContext(DashboardNavigationGuardContext);
  const { showUnsavedChangesPrompt } = useAppAlert();

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;

      if (pathsEqual(pathname, href)) return;

      const guard = ctx?.guardRef.current;
      if (!guard?.dirty) return;

      e.preventDefault();

      const choice = await showUnsavedChangesPrompt({
        title: "Sair sem salvar?",
        message: "Você tem alterações nesta página. Salvar antes de ir para outra área?",
      });

      if (choice === "cancel") return;

      if (choice === "save") {
        const ok = await guard.save();
        if (!ok) return;
      }

      router.push(href);
    },
    [href, onClick, pathname, router, ctx, showUnsavedChangesPrompt]
  );

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
