// Prizm CRM API Configuration
// Backend: Perfex CRM (CodeIgniter) at ms.prizm-energy.com/MS

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://ms.prizm-energy.com";

// REST API base (JWT auth)
export const API_URL = `${BASE_URL}/MS/api`;

// Admin panel base (session auth for AJAX endpoints)
export const ADMIN_URL = `${BASE_URL}/MS/admin`;

// Mobile auth endpoint
export const MOBILE_AUTH_URL = `${BASE_URL}/MS/mobile_auth.php`;

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
  return `${BASE_URL}/MS/uploads/staff_profile_images/${staffid}/${size}_${filename}`;
}
