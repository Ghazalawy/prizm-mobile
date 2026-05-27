/**
 * Global "auth invariant violated" channel.
 *
 * Background: after the 2026-05-23 JWT key rotation, every cached token
 * signed with the OLD key began failing server-side validation. Perfex's
 * Authorization_Token returns HTTP 404 (yes, 404 — that's REST_Controller's
 * default for missing-credentials) with body:
 *   {"status":false,"message":"Signature verification failed"}
 *
 * Without an interceptor, each module's list/detail screen renders its
 * generic error state (the dreaded red triangle) and the app looks dead.
 *
 * This channel decouples detection (in lib/api.ts and other fetch sites)
 * from reaction (in AuthContext, which clears the session and routes to
 * /login). The handler fires at most once every DEBOUNCE_MS so a screen
 * with several parallel queries doesn't trigger N kick-outs.
 *
 * Post-login grace period: after a successful login, the dashboard fires
 * 12+ parallel queries. If any endpoint on the server returns 401 for a
 * reason OTHER than an invalid token (e.g. missing route, permission
 * misconfiguration), we must NOT treat it as session-expired — the token
 * was literally just obtained and is known-good.  All stale-token
 * responses from a previous session are already filtered by the
 * generation guard.  Therefore, any invalid-token signal arriving within
 * GRACE_PERIOD_MS of login is a false positive and is silently ignored.
 */
type Handler = () => void;

let handler: Handler | null = null;
let lastFiredAt = 0;
let sessionGeneration = 0;
let loggedInAt = 0;

const DEBOUNCE_MS = 5000;
const GRACE_PERIOD_MS = 5000;

export function setInvalidTokenHandler(h: Handler | null) {
  handler = h;
}

/**
 * Returns the current session generation at the time of the call.
 * Callers (e.g. apiRequest) snapshot this BEFORE making a request and
 * pass it to notifyInvalidToken so stale responses from a previous
 * session don't trigger sign-out after a fresh login.
 */
export function getSessionGeneration(): number {
  return sessionGeneration;
}

export function notifyInvalidToken(requestGeneration?: number) {
  // If the request was made in a previous session (generation mismatch),
  // ignore it — a fresh login has already replaced the token.
  if (requestGeneration !== undefined && requestGeneration !== sessionGeneration) return;
  // Post-login grace period: the token was just obtained.  Any 401
  // arriving now is a false positive from the dashboard query burst
  // hitting an endpoint that returns 401 for non-auth reasons.
  if (loggedInAt > 0 && Date.now() - loggedInAt < GRACE_PERIOD_MS) return;
  const now = Date.now();
  if (now - lastFiredAt < DEBOUNCE_MS) return;
  lastFiredAt = now;
  if (handler) handler();
}

/** Call after a successful login so a future expiry can fire again. */
export function resetInvalidTokenDebounce() {
  lastFiredAt = 0;
  sessionGeneration++;
  loggedInAt = Date.now();
}
