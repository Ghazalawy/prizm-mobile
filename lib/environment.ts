import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useSyncExternalStore, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────

export type EnvironmentKey = "production" | "development" | "local";

export type Environment = {
  key: EnvironmentKey;
  label: string;
  apiUrl: string;
  adminUrl: string;
  authUrl: string;
  /** Uploads / avatar base path (everything before /uploads/…) */
  uploadsBase: string;
  color: string;
};

// ── Static environment definitions ───────────────────────────────────────

const BASE = "https://ms.prizm-energy.com";

export const ENVIRONMENTS: Record<EnvironmentKey, Environment> = {
  production: {
    key: "production",
    label: "Production",
    apiUrl: `${BASE}/MS/api`,
    adminUrl: `${BASE}/MS/admin`,
    authUrl: `${BASE}/MS/mobile_auth.php`,
    uploadsBase: `${BASE}/MS`,
    color: "#15803D",
  },
  development: {
    key: "development",
    label: "Development (MS_dev)",
    apiUrl: `${BASE}/MS_dev/api`,
    adminUrl: `${BASE}/MS_dev/admin`,
    authUrl: `${BASE}/MS_dev/mobile_auth.php`,
    uploadsBase: `${BASE}/MS_dev`,
    color: "#B45309",
  },
  local: {
    key: "local",
    label: "Local (WAMP)",
    apiUrl: "http://10.0.2.2/prizm331/api",
    adminUrl: "http://10.0.2.2/prizm331/admin",
    authUrl: "http://10.0.2.2/prizm331/mobile_auth.php",
    uploadsBase: "http://10.0.2.2/prizm331",
    color: "#7C3AED",
  },
};

// ── Module state ─────────────────────────────────────────────────────────

const STORAGE_KEY = "prizm_environment";
let _current: EnvironmentKey = "production";
let _initDone = false;

type Listener = () => void;
const _listeners = new Set<Listener>();
function _notify() {
  _listeners.forEach((fn) => fn());
}

// ── Public API ───────────────────────────────────────────────────────────

/** Synchronously returns the current environment. Safe to call anywhere. */
export function getCurrentEnvironment(): Environment {
  return ENVIRONMENTS[_current];
}

export function getEnvironmentKey(): EnvironmentKey {
  return _current;
}

export function isDevEnvironment(): boolean {
  return _current === "development";
}

/**
 * Read persisted environment from AsyncStorage. Call once at app boot
 * (before the first API request). Defaults to production if nothing stored.
 */
export async function initEnvironment(): Promise<EnvironmentKey> {
  if (_initDone) return _current;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "development" || stored === "production" || stored === "local") {
      _current = stored;
    }
  } catch {
    // Defensive — fall through to production default.
  }
  _initDone = true;
  _notify();
  return _current;
}

/**
 * Persist a new environment choice. Callers are responsible for clearing
 * auth + React Query cache and redirecting to login afterwards.
 */
export async function setEnvironment(key: EnvironmentKey): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, key);
  _current = key;
  _notify();
}

// ── React hook (useSyncExternalStore) ────────────────────────────────────

function subscribe(listener: Listener) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function getSnapshot(): Environment {
  return ENVIRONMENTS[_current];
}

/**
 * Reactive hook — re-renders when the environment switches.
 * Returns the full Environment object.
 */
export function useEnvironment(): Environment {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── Dev-banner dismiss state (session-only, not persisted) ───────────────

let _bannerDismissed = false;
const _bannerListeners = new Set<Listener>();

function _notifyBanner() {
  _bannerListeners.forEach((fn) => fn());
}

export function dismissDevBanner(): void {
  _bannerDismissed = true;
  _notifyBanner();
}

export function isDevBannerDismissed(): boolean {
  return _bannerDismissed;
}

/** Reset on env switch so the banner re-appears in the new session. */
export function resetDevBannerDismiss(): void {
  _bannerDismissed = false;
  _notifyBanner();
}

export function useDevBannerVisible(): boolean {
  const env = useEnvironment();
  const dismissed = useSyncExternalStore(
    (l) => {
      _bannerListeners.add(l);
      return () => { _bannerListeners.delete(l); };
    },
    () => _bannerDismissed,
    () => _bannerDismissed,
  );
  return env.key === "development" && !dismissed;
}
