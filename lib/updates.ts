import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as SecureStore from "expo-secure-store";
import { BUILD_TIME } from "./build-info";

// We compare the timestamp the user's installed APK was built (BUILD_TIME, ISO 8601)
// against the GitHub release's `published_at`. If the release is newer, an update
// is available. This deliberately avoids relying on semver bumps in package.json.

const RELEASE_API =
  "https://api.github.com/repos/Ghazalawy/prizm-mobile/releases/latest";

const DISMISSED_KEY = "prizm_update_dismissed_for"; // stores the publishedAt string
                                                    // the user last dismissed.

export type UpdateInfo = {
  apkUrl: string;
  publishedAt: string;
  htmlUrl: string;
  sizeBytes: number;
};

/**
 * Returns an UpdateInfo if a newer release is available AND the user hasn't
 * already dismissed it. Returns null otherwise. Never throws — network/parse
 * errors silently return null so the app keeps working offline.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  // The whole feature is Android-only for now (install intent is Android).
  if (Platform.OS !== "android") return null;
  // No comparison possible in dev builds — bail out.
  if (BUILD_TIME === "dev") return null;

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

    // IMPORTANT: use the ASSET's updated_at, not release.published_at.
    // We re-upload prizm-mobile.apk to the same rolling "latest" tag on every
    // build, so the release's published_at stays frozen at the first build.
    // Only the asset's updated_at tracks each new build.
    const publishedAt = (apk.updated_at || j.published_at) as string;
    if (!publishedAt) return null;

    // Compare lexicographically — ISO 8601 strings sort correctly as long as
    // both are UTC ("Z" suffix), which GitHub guarantees.
    if (publishedAt <= BUILD_TIME) return null;

    // Respect the user's "Not now" choice on this exact build.
    const dismissed = await SecureStore.getItemAsync(DISMISSED_KEY);
    if (dismissed === publishedAt) return null;

    return {
      apkUrl: apk.browser_download_url,
      publishedAt,
      htmlUrl: j.html_url,
      sizeBytes: apk.size || 0,
    };
  } catch {
    return null;
  }
}

export async function dismissUpdate(publishedAt: string): Promise<void> {
  await SecureStore.setItemAsync(DISMISSED_KEY, publishedAt);
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
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) await FileSystem.deleteAsync(dest, { idempotent: true });
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
