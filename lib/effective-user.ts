import { useMemo } from "react";
import { useCurrentUser } from "./auth-context";
import { useImpersonation } from "./impersonation";
import { useMyProfile } from "./queries/my";

/**
 * The user-perspective every screen should render from.
 *
 * - When NOT impersonating: returns the real signed-in user from
 *   SecureStore (same as useCurrentUser).
 * - When impersonating: returns the impersonated staff's profile,
 *   sourced from /api/my/profile which the backend auto-rewires via
 *   the X-Impersonate-Staff-Id header.
 *
 * Use this in any UI that says "you" — avatar, name, role, member-
 * since, my-leave, my-payslips, etc. The whole point of View-As is
 * that the admin gets to BE that user on every surface, not just on
 * lists and approvals.
 *
 * For the LITERAL real admin (e.g. when we need to know who's actually
 * driving the impersonation — for audit log render or the "Stop"
 * button label), useCurrentUser() still returns the original.
 */
export type EffectiveUser = {
  staffid: number | null;
  firstname: string;
  lastname: string;
  email: string;
  profile_image: string | null;
  role_name?: string | null;
  /** True iff this user is the impersonated one (admin viewing as
   *  someone else). Drives banner colour, "you're acting as" hints,
   *  etc. */
  isImpersonated: boolean;
};

export function useEffectiveUser(): EffectiveUser | null {
  const realUser = useCurrentUser();
  const impersonation = useImpersonation();
  // The profile query auto-applies the X-Impersonate-Staff-Id header
  // (via buildAuthHeaders inside its hook), so the response IS the
  // impersonated user's profile when active. We force-enable the query
  // even on the real-user path so the cache is warm if impersonation
  // starts later.
  const profileQ = useMyProfile();

  return useMemo(() => {
    if (impersonation && profileQ.data) {
      const p = profileQ.data;
      return {
        staffid: typeof p.staffid === "number" ? p.staffid : impersonation.staffid,
        firstname: p.firstname || impersonation.name?.split(/\s+/)[0] || "",
        lastname: p.lastname || impersonation.name?.split(/\s+/).slice(1).join(" ") || "",
        email: p.email || impersonation.email || "",
        profile_image: p.profile_image || null,
        role_name: p.role_name ?? null,
        isImpersonated: true,
      };
    }
    if (impersonation) {
      // /api/my/profile hasn't resolved yet — render from the cached
      // impersonation target so the avatar/name don't flash through
      // the real user. profile_image is null until /api/my/profile
      // lands → falls back to the initial-letter circle.
      return {
        staffid: impersonation.staffid,
        firstname: impersonation.name?.split(/\s+/)[0] || "",
        lastname: impersonation.name?.split(/\s+/).slice(1).join(" ") || "",
        email: impersonation.email || "",
        profile_image: null,
        role_name: null,
        isImpersonated: true,
      };
    }
    if (realUser) {
      return {
        staffid: realUser.staffid ?? null,
        firstname: realUser.firstname || "",
        lastname: realUser.lastname || "",
        email: realUser.email || "",
        profile_image: realUser.profile_image || null,
        role_name: null,
        isImpersonated: false,
      };
    }
    return null;
  }, [realUser, impersonation, profileQ.data]);
}
