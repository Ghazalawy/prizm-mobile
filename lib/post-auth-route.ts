const DEFAULT_AUTHENTICATED_ROUTE = "/(tabs)";

/**
 * Accept only local Expo routes when returning from sign-in. This lets a cold
 * App Link survive password or biometric authentication without turning the
 * login page into an open redirect.
 */
export function safePostAuthRoute(returnTo: string | string[] | undefined): string {
  const candidate = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }
  return candidate;
}
