import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse } from "../api";
import { getSessionGeneration } from "../auth-events";

/**
 * Activity log feed. Backed by the universal /api/core_crm_api/entity
 * endpoint which lets us run a filtered `list` on tblactivity_log
 * (description, date, staffid, fullname).
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
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const body: Record<string, unknown> = {
    entity: "activity_log",
    action: "list",
    filters: {
      limit: opts.limit ?? 100,
      offset: opts.offset ?? 0,
    },
  };
  if (opts.staffid) {
    (body.filters as Record<string, unknown>).staffid = opts.staffid;
  }
  const res = await fetch(`${API_URL}/core_crm_api/entity`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const token = headers["authtoken"];
  const { body: j, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
