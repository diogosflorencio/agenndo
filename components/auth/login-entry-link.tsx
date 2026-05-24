"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { resolveProviderLoginDestination } from "@/lib/auth/resolve-login-destination";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  className?: string;
  children: React.ReactNode;
  /** Se já logado, vai para dashboard/setup em vez de /login. */
  smartRedirect?: boolean;
};

export function LoginEntryLink({ href = "/login", className, children, smartRedirect = true }: Props) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(smartRedirect);

  useEffect(() => {
    if (!smartRedirect) {
      setChecking(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setLoggedIn(Boolean(session?.user));
        setChecking(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session?.user));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [smartRedirect]);

  const goIfLoggedIn = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!smartRedirect || !loggedIn) return;
      e.preventDefault();
      const supabase = createClient();
      const dest = await resolveProviderLoginDestination(supabase);
      router.push(dest);
      router.refresh();
    },
    [loggedIn, router, smartRedirect]
  );

  return (
    <Link
      href={loggedIn && smartRedirect ? "/dashboard" : href}
      className={cn(className, checking && "pointer-events-none opacity-90")}
      onClick={(e) => void goIfLoggedIn(e)}
    >
      {children}
    </Link>
  );
}
