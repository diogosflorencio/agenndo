"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type BrowserAuthSnapshot = {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  /** Primeira leitura de sessão (cache/cookies) concluída. */
  ready: boolean;
};

const SERVER_SNAPSHOT: BrowserAuthSnapshot = {
  userId: null,
  userEmail: null,
  userName: null,
  ready: false,
};

let snapshot: BrowserAuthSnapshot = { ...SERVER_SNAPSHOT };
const listeners = new Set<() => void>();
const nameCache = new Map<string, string | null>();
let started = false;
let supabaseRef: SupabaseClient | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function metaName(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;
  const n = (meta.full_name ?? meta.name ?? "") as string;
  return n.trim() || null;
}

async function resolveUserName(
  supabase: SupabaseClient,
  userId: string,
  fallback: string | null
): Promise<string | null> {
  if (nameCache.has(userId)) return nameCache.get(userId) ?? fallback;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const name = data?.full_name?.trim() || fallback;
  nameCache.set(userId, name);
  return name;
}

function applyUser(user: User | null) {
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const fallback = metaName(user?.user_metadata as Record<string, unknown> | undefined);
  const keepName = userId && snapshot.userId === userId ? snapshot.userName : null;

  snapshot = {
    userId,
    userEmail,
    userName: userId ? keepName : null,
    ready: true,
  };
  emit();

  if (!userId) return;

  if (!supabaseRef) return;
  const client = supabaseRef;
  queueMicrotask(() => {
    void resolveUserName(client, userId, fallback).then((name) => {
      if (snapshot.userId !== userId) return;
      snapshot = { ...snapshot, userName: name };
      emit();
    });
  });
}

/** Uma única assinatura auth no browser - sobrevive a remounts (vitrine ↔ agendar ↔ /conta). */
export function initBrowserAuthStore(supabase: SupabaseClient) {
  if (started || typeof window === "undefined") return;
  started = true;
  supabaseRef = supabase;

  void supabase.auth.getSession().then(({ data: { session } }) => {
    applyUser(session?.user ?? null);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    applyUser(session?.user ?? null);
  });

  window.addEventListener("beforeunload", () => subscription.unsubscribe(), { once: true });

  queueMicrotask(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) applyUser(user);
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): BrowserAuthSnapshot {
  return snapshot;
}

export function useSupabaseAuth(): BrowserAuthSnapshot {
  if (typeof window !== "undefined") {
    const { createClient } = require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");
    createClient();
  }
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
