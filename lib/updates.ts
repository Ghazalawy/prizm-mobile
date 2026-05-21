import { Platform } from "react-native";
// expo-file-system's createDownloadResumable was removed from the new top-level
// API in Expo SDK 54 (in favor of File/Directory classes). The legacy entry
// point keeps the function-style API working with zero migration.
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as SecureStore from "expo-secure-store";
import { BUILD_SHA } from "./build-info";

// Update detection is SHA-based, not timestamp-based:
//
// The workflow publishes the release with name "Latest build (<short_sha>)".
// We parse the short SHA out of the release name and compare against the
// BUILD_SHA embedded in the installed APK (also short SHA, set at build time
// in lib/build-info.ts). Match → no update. Different → newer build exists.
//
// Why not compare timestamps? BUILD_TIME is captured at CI job START, but the
// release asset's updated_at is set ~15 min later when upload finishes —
// so the SAME APK always looks "15 minutes newer than itself". The SHA is
// monotonic per commit and never collides with the same build.

const RELEASE_API =
  "https://api.github.com/repos/Ghazalawy/prizm-mobile/releases/latest";

// SecureStore key. We store the remote SHA the user dismissed so the banner
// stays hidden for that exact build but reappears for any later one.
const DISMISSED_KEY = "prizm_update_dismissed_sha";

export type UpdateInfo = {
  apkUrl: string;
  remoteSha: string;
  htmlUrl: string;
  sizeBytes: number;
};

/**
 * Returns an UpdateInfo if a newer build is available AND the user hasn't
 * already dismissed it. Returns null otherwise. Never throws — network/parse
 * errors silently return null so the app keeps working offline.
 */
export async function checkForUpdate(
  options: { ignoreDismissed?: boolean } = {}
): Promise<UpdateInfo | null> {
  // The whole feature is Android-only for now (install intent is Android).
  if (Platform.OS !== "android") return null;
  // No comparison possible in dev builds — bail out.
  if (!BUILD_SHA || BUILD_SHA === "dev") return null;

  try {
    // 5-second timeout so a slow/offline network on launch doesn't keep the
    // banner check hanging in the background.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const j = await res.json();

    const apk = (j.assets || []).find(
      (a: any) => a.name === "prizm-mobile.apk"
    );
    if (!apk) return null;

    // Parse the short SHA out of the release name, e.g.
    //   "Latest build (b3f019e)"  →  "b3f019e"
    const name = (j.name || "") as string;
    const match = name.match(/\(([a-f0-9]{6,12})\)/i);
    const remoteSha = match?.[1]?.toLowerCase();
    if (!remoteSha) return null;

    // Same build? No banner.
    if (remoteSha === BUILD_SHA.toLowerCase()) return null;

    // Respect the user's "Not now" choice on this exact remote build.
    if (!options.ignoreDismissed) {
      const dismissed = await SecureStore.getItemAsync(DISMISSED_KEY);
      if (dismissed === remoteSha) return null;
    }

    return {
      apkUrl: apk.browser_download_url,
      remoteSha,
      htmlUrl: j.html_url,
      sizeBytes: apk.size || 0,
    };
  } catch {
    return null;
  }
}

export async function dismissUpdate(remoteSha: string): Promise<void> {
  await SecureStore.setItemAsync(DISMISSED_KEY, remoteSha);
}

/**
 * Download the APK and hand it to Android's package installer. Caller should
 * show progress via the onProgress callback (0..1).
 *
 * On Android the system will then show a confirmation dialog ("Install
 * prizm-mobile?") — the user has to tap Install once. This is a hard OS
 * requirement (REQUEST_INSTALL_PACKAGES permission only lets us TRIGGER
 * the installer; it cannot silently install).
 */
export async function downloadAndInstall(
  info: UpdateInfo,
  onProgress?: (frac: number) => void
): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("In-app install is Android-only.");
  }

  const dest = (FileSystem.cacheDirectory || "") + "prizm-mobile-update.apk";

  // Wipe any prior partial download so we never install a stale file.
  try {
    const existing = await FileSystem.getInfoAsync(dest);
    if (existing.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
  } catch {
    // ignore
  }

  const dl = FileSystem.createDownloadResumable(
    info.apkUrl,
    dest,
    {},
    (p) => {
      if (p.totalBytesExpectedToWrite > 0) {
        onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    }
  );

  const result = await dl.downloadAsync();
  if (!result) throw new Error("Download cancelled");

  // FileProvider content URI (file:// URIs are blocked on Android 7+).
  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1 /* FLAG_GRANT_READ_URI_PERMISSION */,
    type: "application/vnd.android.package-archive",
  });
}
