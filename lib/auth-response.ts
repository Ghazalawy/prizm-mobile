const UNAMBIGUOUS_JWT_PATTERNS = [
  /signature verification failed/i,
  /token expired/i,
  /expired token/i,
  /token time expire/i,
  /jwt expired/i,
];

/** Only explicit JWT-layer failures are allowed to destroy local auth state. */
export function isInvalidTokenResponse(
  _status: number,
  body: any,
  hadToken: boolean,
): boolean {
  if (!hadToken) return false;
  if (body && body.status === false && typeof body.message === "string") {
    return UNAMBIGUOUS_JWT_PATTERNS.some((pattern) => pattern.test(body.message));
  }
  return false;
}
