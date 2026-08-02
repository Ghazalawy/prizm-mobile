import { useQuery } from "@tanstack/react-query";
import { apiRequest, buildQS } from "../api";

/**
 * Activity log feed. Backed by the allowlisted /api/my/activity endpoint,
 * which always scopes rows to the effective authenticated staff member.
 *
 * For "My Activity" we filter by staffid = current user. Optionally a
 * client-side filter narrows down to `[Mobile]`-prefixed rows so the user
 * can see only the actions THEY took from the phone (which is how we
 * answer "what did I do on mobile today?").
 */

export type ActivityRow = {
  id: number;
  description: string;
  /** Perfex stores this as a 'Y-m-d H:i:s' string in server TZ. */
  date: string;
  staffid: number | null;
  fullname: string | null;
};

async function fetchActivity(opts: {
  staffid?: number | null;
  limit?: number;
  offset?: number;
}): Promise<ActivityRow[]> {
  const j = await apiRequest(`my/activity${buildQS({
    limit: opts.limit ?? 100,
    offset: opts.offset ?? 0,
  })}`);
  if (!j?.status) throw new Error(j?.message || "Activity fetch failed");
  return (j.data || []) as ActivityRow[];
}

/** Activity log entries for a specific staff member, newest first. */
export function useMyActivity(staffid: number | null | undefined, limit = 100) {
  return useQuery({
    queryKey: ["activity", "mine", staffid, limit],
    queryFn: () => fetchActivity({ staffid: staffid ?? null, limit }),
    enabled: typeof staffid === "number" && staffid > 0,
    staleTime: 30 * 1000, // 30 s — activity feed should feel fresh
  });
}

/** Helper: is this row one the user generated via the mobile app? */
export function isMobileRow(row: ActivityRow): boolean {
  return typeof row.description === "string" &&
    row.description.trimStart().startsWith("[Mobile]");
}
