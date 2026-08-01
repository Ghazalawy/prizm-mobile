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
 * A successful login advances `sessionGeneration`. Parallel responses from
 * the previous session are ignored by that generation guard, while a real
 * 401 from the new session is handled immediately. Do not add a time-based
 * grace window here: it masks genuine post-login authentication failures
 * and leaves the user stranded on a protected screen.
 */
type Handler = () => void;

let handler: Handler | null = null;
let lastFiredAt = 0;
let sessionGeneration = 0;

const DEBOUNCE_MS = 5000;

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
  const now = Date.now();
  if (now - lastFiredAt < DEBOUNCE_MS) return;
  lastFiredAt = now;
  if (handler) handler();
}

/** Call after a successful login so a future expiry can fire again. */
export function resetInvalidTokenDebounce() {
  lastFiredAt = 0;
  sessionGeneration++;
}
