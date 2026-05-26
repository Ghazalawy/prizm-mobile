import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api";
import {
  type DashboardLayout,
  DEFAULT_LAYOUT,
  getCachedApiLayout,
  setCachedApiLayout,
  setLayout as setLocalLayout,
} from "../dashboard-layout";
import { useImpersonation } from "../impersonation";

/**
 * Fetch the resolved dashboard layout from the backend.
 * The resolution chain on the server is:
 *   1. Staff override → 2. Job position → 3. Department → 4. System default
 *
 * On success, the result is cached in SecureStore so the app works offline.
 * On failure, falls back to the local SecureStore cache or DEFAULT_LAYOUT.
 *
 * The query key includes the effective staff ID so that switching
 * impersonation triggers a fresh fetch for the impersonated user.
 */
export function useDashboardProfile() {
  const imp = useImpersonation();
  const effectiveKey = imp?.staffid ?? "self";

  return useQuery<DashboardLayout>({
    queryKey: ["dashboard", "profile", effectiveKey],
    queryFn: async () => {
      try {
        const res = await apiRequest("dashboard/profile");
        const layout: DashboardLayout = res?.data ?? res;
        if (layout && Array.isArray(layout.order) && layout.order.length > 0) {
          await setCachedApiLayout(layout);
          return layout;
        }
      } catch {
        // API unreachable — fall through to cache
      }
      const cached = await getCachedApiLayout();
      if (cached && Array.isArray(cached.order) && cached.order.length > 0) {
        return cached;
      }
      return DEFAULT_LAYOUT;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Save the user's personal layout override to the server.
 * Also writes to local SecureStore for instant UI update.
 */
export function useSaveDashboardProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      await setLocalLayout(layout);
      try {
        await apiRequest("dashboard/profile", {
          method: "PUT",
          body: JSON.stringify({
            type: "staff_override",
            order: layout.order,
            hidden: layout.hidden,
          }),
        });
      } catch {
        // Offline save — local layout is already persisted
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "profile"] });
    },
  });
}

/** Invalidate all dashboard profile caches — call after impersonation changes. */
export function invalidateDashboardProfiles(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["dashboard", "profile"] });
}

/**
 * Fetch the full widget catalog from the backend.
 */
export function useDashboardWidgets() {
  return useQuery({
    queryKey: ["dashboard", "widgets"],
    queryFn: async () => {
      const res = await apiRequest("dashboard/widgets");
      return (res?.data ?? []) as Array<{
        id: number;
        widget_key: string;
        title: string;
        icon: string;
        color: string;
        component_type: string;
        default_size: string;
        permission_feature: string | null;
        module: string;
        route: string;
        sort_order: number;
      }>;
    },
    staleTime: 10 * 60 * 1000,
  });
}
