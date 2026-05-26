import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore, useCallback } from "react";

/**
 * Pinned modules for the bottom tab bar.
 *
 * Default tabs (always shown, not removable): Home, Reports, ERP, Settings.
 * Users can pin additional modules from the ERP hub or the "+" picker,
 * which appear between ERP and Settings in the bottom bar.
 *
 * Stored as a simple array of module keys in AsyncStorage.
 */

const STORAGE_KEY = "@prizm/pinned-tabs-v1";

type Listener = () => void;

let cache: string[] = [];
let loaded = false;
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) fn();
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function getSnapshot(): string[] {
  return cache;
}

async function load(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) cache = parsed;
    }
  } catch { /* silent */ }
  loaded = true;
  notify();
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch { /* silent */ }
}

/** React hook — returns the current pinned module keys. */
export function usePinnedTabs(): string[] {
  if (!loaded) load();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Synchronous read for non-React code. */
export function getPinnedTabs(): string[] {
  return cache;
}

export async function pinModule(key: string): Promise<void> {
  if (!cache.includes(key)) {
    cache = [...cache, key];
    notify();
    await persist();
  }
}

export async function unpinModule(key: string): Promise<void> {
  cache = cache.filter((k) => k !== key);
  notify();
  await persist();
}

export async function togglePin(key: string): Promise<boolean> {
  if (cache.includes(key)) {
    await unpinModule(key);
    return false;
  }
  await pinModule(key);
  return true;
}

export function isPinned(key: string): boolean {
  return cache.includes(key);
}

export async function initPinnedTabs(): Promise<void> {
  if (!loaded) await load();
}
