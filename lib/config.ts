// Prizm CRM API Configuration
// Backend: Perfex CRM (CodeIgniter) at ms.prizm-energy.com/MS
//
// URL exports are `let` so they can be reassigned by applyEnvironment()
// when the user switches between production and development (MS_dev).
// Metro's module system creates live bindings, so all importers see the
// updated value after the switch.

import { getCurrentEnvironment } from "./environment";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://ms.prizm-energy.com";

// REST API base (JWT auth)
export let API_URL = `${BASE_URL}/MS/api`;

// Admin panel base (session auth for AJAX endpoints)
export let ADMIN_URL = `${BASE_URL}/MS/admin`;

// Mobile auth endpoint
export let MOBILE_AUTH_URL = `${BASE_URL}/MS/mobile_auth.php`;

/**
 * Re-read the current environment and update every mutable URL export.
 * Called once at app boot (after initEnvironment resolves) and again
 * whenever the user switches environments from Settings.
 */
export function applyEnvironment(): void {
  const env = getCurrentEnvironment();
  API_URL = env.apiUrl;
  ADMIN_URL = env.adminUrl;
  MOBILE_AUTH_URL = env.authUrl;
}

/**
 * Build the full URL for a staff profile image.
 *
 * Perfex stores avatars at /MS/uploads/staff_profile_images/{staffid}/{filename}
 * and persists ONLY the resized copies (small_<filename>, thumb_<filename>) —
 * the original is discarded after upload. The API returns just the bare
 * filename (e.g. "DSC_0039.jpg") so the client has to assemble the full URL
 * and pick the small/thumb prefix that exists on disk.
 *
 * Returns null when either input is missing — call sites should fall back to
 * the initial-letter placeholder.
 */
export function staffAvatarUrl(
  staffid: number | string | null | undefined,
  filename: string | null | undefined,
  size: "thumb" | "small" = "small",
): string | null {
  if (!staffid || !filename) return null;
  const env = getCurrentEnvironment();
  return `${env.uploadsBase}/uploads/staff_profile_images/${staffid}/${size}_${filename}`;
}
