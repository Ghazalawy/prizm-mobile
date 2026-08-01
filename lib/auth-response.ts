const UNAMBIGUOUS_JWT_PATTERNS = [
  /signature verification failed/i,
  /wrong number of segments/i,
  /token expired/i,
  /expired token/i,
  /token time expire/i,
  /jwt expired/i,
];

/** Only explicit JWT-layer failures are allowed to destroy local auth state. */
export function isInvalidTokenResponse(
  status: number,
  body: any,
  hadToken: boolean,
): boolean {
  if (!hadToken) return false;

  // Mobile API controllers reserve 401 for an unauthenticated caller. A
  // permission failure is 403 and a CSRF failure is 419; neither may sign a
  // user out. This also catches controller-managed endpoints that return a
  // plain "Unauthenticated" body instead of a JWT-library error string.
  if (status === 401) return true;
  if (status === 403 || status === 419) return false;

  // The legacy REST_Controller reports JWT validation failures as 404. Keep
  // this branch message-specific because a real missing route is also 404.
  if (status === 404 && body && body.status === false && typeof body.message === "string") {
    return UNAMBIGUOUS_JWT_PATTERNS.some((pattern) => pattern.test(body.message));
  }
  return false;
}
