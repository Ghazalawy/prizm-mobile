import { getCurrentEnvironment } from "./environment";

function encodePath(value: string): string {
  return value
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

/**
 * Return the current report-image URL followed by the legacy location.
 * Web-created reports moved under uploads/prizm_reports/{reportId}/images,
 * while older and mobile-uploaded images can still exist in module assets.
 */
export function reportImageUrls(
  reportId: number | string | null | undefined,
  imagePath: string | null | undefined,
): string[] {
  const raw = String(imagePath ?? "").trim();
  if (!raw) return [];
  if (/^https?:\/\//i.test(raw)) return [raw];

  const base = getCurrentEnvironment().uploadsBase.replace(/\/+$/, "");
  const relative = raw.replace(/^\/+/, "");
  const encoded = encodePath(relative);

  if (relative.startsWith("uploads/") || relative.startsWith("modules/")) {
    return [`${base}/${encoded}`];
  }

  const legacyUrl = `${base}/modules/prizm_reports/assets/images/${encoded}`;
  if (!reportId) return [legacyUrl];

  return [
    `${base}/uploads/prizm_reports/${encodeURIComponent(String(reportId))}/images/${encoded}`,
    legacyUrl,
  ];
}

export function reportImageUrl(
  reportId: number | string | null | undefined,
  imagePath: string | null | undefined,
): string {
  return reportImageUrls(reportId, imagePath)[0] ?? "";
}
