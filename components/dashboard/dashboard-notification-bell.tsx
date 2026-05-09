"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useDashboard } from "@/lib/dashboard-context";
import { useTheme } from "@/lib/theme-context";
import {
  fetchRecentDashboardNotifications,
  markAllUnreadDashboardNotifications,
  useDashboardNotifications,
  type DashboardNotificationRow,
} from "@/lib/dashboard-notifications";
import { GuardedDashboardLink } from "@/lib/dashboard-navigation-guard";
import { cn } from "@/lib/utils";

function formatNotifTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function computePanelPos(btn: HTMLButtonElement | null) {
  if (!btn || typeof window === "undefined") return null;
  const r = btn.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 16);
  let left = r.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  return { top: r.bottom + 8, left, width };
}

export function DashboardNotificationBell({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { business, isStaffDashboard } = useDashboard();
  const businessId = !isStaffDashboard ? business?.id : undefined;
  const { unreadCount, refresh } = useDashboardNotifications(businessId);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DashboardNotificationRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const sync = () => setPanelPos(computePanelPos(btnRef.current));
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !businessId) return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      const supabase = createClient();
      const rows = await fetchRecentDashboardNotifications(supabase, businessId);
      if (cancelled) return;
      setItems(rows);
      setListLoading(false);

      const hadUnread = rows.some((r) => r.read_at == null);
      if (hadUnread) {
        const ok = await markAllUnreadDashboardNotifications(supabase, businessId);
        if (!cancelled && ok) {
          const nowIso = new Date().toISOString();
          setItems((prev) => prev.map((r) => ({ ...r, read_at: r.read_at ?? nowIso })));
          await refresh();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, businessId, refresh]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      const panelEl = document.getElementById("dashboard-notif-popover-panel");
      if (panelEl?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  if (isStaffDashboard || !business) return null;

  const panelSurface = isLight
    ? "border border-gray-200 bg-white shadow-xl"
    : "border border-white/[0.1] bg-[#0c1210] shadow-[0_16px_48px_rgba(0,0,0,0.55)]";

  const portalReady =
    open && panelPos && typeof document !== "undefined" ? createPortal(
      <motion.div
        id="dashboard-notif-popover-panel"
        role="dialog"
        aria-label="Notificações"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn("fixed z-[200] flex max-h-[min(70vh,22rem)] flex-col overflow-hidden rounded-xl", panelSurface)}
        style={{
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
        }}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-between border-b px-3 py-2.5",
            isLight ? "border-gray-200 bg-gray-50/90" : "border-white/[0.06] bg-black/20"
          )}
        >
          <p className={cn("text-sm font-bold", isLight ? "text-gray-900" : "text-white")}>Notificações</p>
          <GuardedDashboardLink
            href="/dashboard/notificacoes"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Ajustes
          </GuardedDashboardLink>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {listLoading && items.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className={cn("px-4 py-8 text-center text-sm", isLight ? "text-gray-500" : "text-gray-400")}>
              Nenhuma notificação ainda.
            </p>
          ) : (
            <ul
              className={cn(
                "divide-y py-1",
                isLight ? "divide-gray-100" : "divide-white/[0.06]"
              )}
            >
              {items.map((n) => {
                const unread = n.read_at == null;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-3 py-3 text-left transition-colors",
                      unread ? (isLight ? "bg-primary/[0.06]" : "bg-primary/[0.08]") : "",
                      isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="material-symbols-outlined shrink-0 text-lg text-primary">{n.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold leading-snug", isLight ? "text-gray-900" : "text-white")}>
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className={cn("mt-0.5 text-xs leading-relaxed", isLight ? "text-gray-600" : "text-gray-400")}>
                          {n.body}
                        </p>
                      ) : null}
                      <p className={cn("mt-1 text-[10px] font-medium tabular-nums", isLight ? "text-gray-400" : "text-gray-500")}>
                        {formatNotifTime(n.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.div>,
      document.body
    ) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg transition-colors shrink-0",
          className
        )}
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("material-symbols-outlined", iconClassName ?? "text-xl")}>notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-h-[18px] min-w-[18px] px-[5px] rounded-full flex items-center justify-center font-bold text-white bg-red-500 ring-2 ring-white dark:ring-[#080c0a] text-[10px] tabular-nums leading-none shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {portalReady}
    </div>
  );
}
