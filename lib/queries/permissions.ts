import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse } from "../api";
import { getSessionGeneration } from "../auth-events";

export type PermissionsPayload = {
  staff_id: number;
  is_admin: boolean;
  permissions: Record<string, Record<string, boolean>>;
};

async function fetchPermissions(): Promise<PermissionsPayload> {
  const gen = getSessionGeneration();
  const authHeaders = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/mobile_parity_api/staff_permissions`, {
    headers: { ...authHeaders },
  });
  const token = authHeaders["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok || body?.status === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body.data as PermissionsPayload;
}

export function usePermissionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["permissions", "staff"],
    queryFn: fetchPermissions,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}
