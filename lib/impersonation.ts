import * as SecureStore from "expo-secure-store";
import { useEffect, useSyncExternalStore } from "react";

/**
 * View-As / admin impersonation state.
 *
 * The admin picks a staff in Settings → View As. We persist a small
 * record { staffid, name } in SecureStore so the impersonation
 * survives app restarts (no surprise "I'm suddenly myself again after
 * minimising the app"). Every authenticated API request appends an
 * `X-Impersonate-Staff-Id: <id>` header (see lib/api.ts). The backend
 * verifies the real caller is admin before honouring the header — so
 * a non-admin who manages to tamper with this state gets no privilege
 * escalation; the request silently proceeds as themselves.
 *
 * UI consumes this via the `useImpersonation()` hook (returns the
 * current record or null) which re-renders whenever the impersonation
 * starts, switches, or stops.
 *
 * Why useSyncExternalStore (the same pattern as lib/inbox-read.ts):
 * a single module-level state needs to be shared across the entire
 * tree without prop drilling, and we want it readable from worklets
 * too (e.g. queryClient.clear callbacks fire from anywhere).
 */
const STORAGE_KEY = "@prizm/view-as-v1";

export type ViewAsTarget = {
  staffid: number;
  name: string;
  email?: string;
  /** Captured at session start so the banner can show "since 09:23". */
  started_at: string; // ISO timestamp
};

type Listener = () => void;

let cache: ViewAsTarget | null = null;
let loaded = false;
const listeners = new Set<Listener>();

function snapshot(): ViewAsTarget | null {
  return cache;
}

function notify() {
  for (const fn of listeners) fn();
}

async function load(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ViewAsTarget;
      if (parsed && typeof parsed.staffid === "number" && parsed.staffid > 0) {
        cache = parsed;
      }
    }
  } catch {
    // Silent — corrupted state is the same as "not impersonating".
  }
  loaded = true;
  notify();
}

async function persist(): Promise<void> {
  try {
    if (cache) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(cache));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch {
    // SecureStore failures are rare; we accept losing persistence on
    // the next launch as the worst case.
  }
}

/** Module-level read for non-React code (e.g. lib/api.ts's apiRequest
 *  needs the current impersonation synchronously when building the
 *  request headers). */
export function getCurrentImpersonation(): ViewAsTarget | null {
  return cache;
}

/** Start a View-As session. Replaces any existing impersonation. */
export async function startImpersonation(target: Omit<ViewAsTarget, "started_at">): Promise<void> {
  cache = { ...target, started_at: new Date().toISOString() };
  notify();
  await persist();
}

/** End the View-As session and return to acting as oneself. */
export async function stopImpersonation(): Promise<void> {
  cache = null;
  notify();
  await persist();
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React hook — returns the current target or null. Re-renders on
 *  start/stop. Loads from disk lazily on first mount. */
export function useImpersonation(): ViewAsTarget | null {
  useEffect(() => {
    if (!loaded) void load();
  }, []);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
