/**
 * Inbox read-state — track which inbox items the user has tapped so the
 * popover can de-emphasize them (drop the dot, drop the bold, drop the
 * light-blue background) on the next render.
 *
 * Stored in AsyncStorage as a JSON array of "type-id" keys. Capped at
 * 500 entries (FIFO) so the file doesn't grow unbounded — the inbox is
 * small enough that this is plenty of headroom while keeping the cache
 * tiny on cold launch.
 *
 * Exposed as a useSyncExternalStore-style subscription so any row can
 * call markRead() and every other row re-renders without a query
 * round-trip.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "@prizm/inbox-read-v1";
const MAX_ENTRIES = 500;

type Listener = () => void;

let cache: Set<string> | null = null;
let order: string[] = []; // FIFO eviction
const listeners = new Set<Listener>();

function snapshot(): Set<string> {
  return cache ?? new Set<string>();
}

function notify() {
  for (const fn of listeners) fn();
}

async function loadFromDisk(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) {
        order = arr.slice(-MAX_ENTRIES);
        cache = new Set(order);
        notify();
        return;
      }
    }
  } catch {}
  cache = new Set();
  notify();
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // disk full / corrupt — accept silent loss of read state
  }
}

/** "approval-1124", "task-883", "mention-pr_26050022" — whatever the row's identity is. */
export function inboxKey(type: string, id: string | number): string {
  return `${type}-${id}`;
}

export function isRead(key: string): boolean {
  return snapshot().has(key);
}

export function markRead(key: string): void {
  if (!cache) cache = new Set();
  if (cache.has(key)) return;
  cache.add(key);
  order.push(key);
  if (order.length > MAX_ENTRIES) {
    const evict = order.shift();
    if (evict) cache.delete(evict);
  }
  notify();
  // Fire-and-forget; we don't want UI gated on disk writes.
  void persist();
}

/** Bulk mark — useful for "Mark all read" buttons later. */
export function markAllRead(keys: string[]): void {
  if (!cache) cache = new Set();
  for (const k of keys) {
    if (!cache.has(k)) {
      cache.add(k);
      order.push(k);
    }
  }
  while (order.length > MAX_ENTRIES) {
    const evict = order.shift();
    if (evict) cache.delete(evict);
  }
  notify();
  void persist();
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Hook returning the *current* read-set. Re-renders the component on any
 * markRead / markAllRead so unread→read transitions show immediately.
 * Loads from disk once on first mount.
 */
export function useReadInbox(): Set<string> {
  useEffect(() => {
    if (cache === null) {
      void loadFromDisk();
    }
  }, []);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
