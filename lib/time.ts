/**
 * Time formatting helpers shared across inbox / notifications / activity
 * surfaces. Kept dependency-free (no date-fns/dayjs) since the formats we
 * need are simple and we'd rather not ship 20+ KB just for "3h" labels.
 */

/**
 * Compact "time since" label, Gmail/Telegram-style.
 *
 *   < 60s    →  "now"
 *   < 60m    →  "5m"
 *   < 24h    →  "3h"
 *   < 7d     →  "2d"
 *   < 365d   →  "5w"  (weeks) above a week, "12 Sep" above a month
 *   >= 365d  →  "Sep 2024"
 *
 * Designed to be 1–4 chars wide so it fits in the right-corner badge
 * on inbox rows without crowding the title. Returns null when the
 * input can't be parsed — caller can decide whether to render an empty
 * slot or omit the label entirely.
 */
export function formatRelativeShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;

  const diffMs = Date.now() - t;
  // Future dates (e.g. due_at) — show absolute month/day. Caller is
  // typically using due_at for that already, but be defensive.
  if (diffMs < 0) {
    return shortAbsolute(new Date(t));
  }

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60)            return "now";
  const min = Math.floor(sec / 60);
  if (min < 60)            return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24)             return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7)             return `${day}d`;
  const wk = Math.floor(day / 7);
  if (day < 30)            return `${wk}w`;
  // Beyond a month — show absolute. Within the current year drop the
  // year for compactness; otherwise show year too.
  const d = new Date(t);
  if (d.getFullYear() === new Date().getFullYear()) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/**
 * Verbose "time since" — for tooltips/long-press reveals.
 * Mirrors the web admin's tooltip format ("25-05-2026 5:21 PM") so the
 * mental model carries across surfaces.
 */
export function formatAbsolute(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  // dd-mm-yyyy h:mm AM/PM (UAE region pattern)
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const min = pad(d.getMinutes());
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${hh}:${min} ${ampm}`;
}

function shortAbsolute(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
