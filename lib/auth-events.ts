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
 */
type Handler = () => void;

let handler: Handler | null = null;
let lastFiredAt = 0;

const DEBOUNCE_MS = 5000;

export function setInvalidTokenHandler(h: Handler | null) {
  handler = h;
}

export function notifyInvalidToken() {
  const now = Date.now();
  if (now - lastFiredAt < DEBOUNCE_MS) return;
  lastFiredAt = now;
  if (handler) handler();
}

/** Call after a successful login so a future expiry can fire again. */
export function resetInvalidTokenDebounce() {
  lastFiredAt = 0;
}
