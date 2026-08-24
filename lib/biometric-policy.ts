/**
 * Pure decision layer for fingerprint sign-in.
 *
 * Deliberately free of imports so it can be exercised directly by
 * `scripts/test-biometric-policy.mjs`. Every regression this module guards
 * against was a decision bug, not an I/O bug:
 *
 *   • v1.14 started requiring a stored credential before it would admit that
 *     fingerprint login was on. Devices upgrading from earlier builds had the
 *     opt-in flag and no credential, so the login screen offered them nothing
 *     but email + password — and, because they had already been asked once,
 *     the "Enable fingerprint?" alert never came back either. A dead end with
 *     no way out from inside the app.
 *   • The same release wiped the opt-in whenever it could not prove which
 *     account a credential belonged to, turning a recoverable state into a
 *     permanent one.
 *
 * The rule that prevents both: "the user wants this" and "we can currently do
 * it" are separate facts. Losing the second must never destroy the first.
 */

/** Raw, durable inputs. `optedIn` and `hasVault` are SecureStore markers. */
export type BiometricFlags = {
  /** Hardware present AND at least one fingerprint/face enrolled. */
  available: boolean;
  /** `prizm_biometric_enabled` — the user asked for fingerprint login. */
  optedIn: boolean;
  /** `prizm_biometric_credentials_ready` — a protected credential exists. */
  hasVault: boolean;
};

export type BiometricGate = BiometricFlags & {
  /** Opted in AND a credential exists → a fingerprint can obtain a new JWT. */
  canSignIn: boolean;
  /** Opted in with no credential → one password entry restores the feature. */
  needsReenrollment: boolean;
};

/** Why the login screen should offer to set fingerprint sign-in up. */
export type BiometricOfferReason = "first-time" | "reenroll";

/**
 * Consecutive failed vault reads before we declare the credential gone.
 *
 * A read fails either because the user tapped Cancel or because the OS
 * destroyed the key — Android invalidates it when fingerprints are added or
 * removed, or the screen lock changes. A cancel is a one-off; an invalidated
 * key fails every time. Counting is how the two are told apart without
 * guessing at platform-specific error strings.
 */
export const VAULT_FAILURE_LIMIT = 3;

export function deriveBiometricGate(flags: BiometricFlags): BiometricGate {
  return {
    ...flags,
    canSignIn: flags.optedIn && flags.hasVault,
    needsReenrollment: flags.optedIn && !flags.hasVault,
  };
}

/**
 * Should the login screen render its "Use fingerprint" button?
 *
 * With a token still on the device the OS prompt alone unlocks the app, so the
 * opt-in is enough. With no token only a stored credential can authenticate
 * again, so the vault must exist too.
 */
export function shouldShowBiometricButton(
  gate: BiometricGate,
  hasToken: boolean,
): boolean {
  if (!gate.available) return false;
  return hasToken ? gate.optedIn : gate.canSignIn;
}

/**
 * Should a successful password login offer to set fingerprint up, and why?
 *
 * `needsReenrollment` intentionally ignores `askedBefore`: the user already
 * said yes to this feature, so a missing credential is a broken state to
 * repair, not a question to ask once and drop forever.
 */
export function resolveBiometricOffer(
  gate: BiometricGate,
  askedBefore: boolean,
): BiometricOfferReason | null {
  if (!gate.available) return null;
  if (gate.needsReenrollment) return "reenroll";
  if (!askedBefore && !gate.canSignIn) return "first-time";
  return null;
}

/** Accounts are compared case-insensitively and whitespace-trimmed. */
export function normalizeBiometricAccount(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * May an existing credential survive a password login as `loginEmail`?
 *
 * Only when we can prove it belongs to that account. A missing marker means an
 * interrupted write, so the owner is unknown and the secret has to go — a
 * fingerprint must never sign someone into a colleague's account. The caller
 * keeps the opt-in and re-offers enrolment, which is what makes this
 * recoverable instead of terminal.
 */
export function shouldKeepVaultForAccount(
  storedAccount: string | null,
  loginEmail: string,
): boolean {
  if (!storedAccount) return false;
  return storedAccount === normalizeBiometricAccount(loginEmail);
}

/**
 * Given the number of consecutive failed reads (this one included), is the
 * credential merely being cancelled or actually gone?
 */
export function classifyVaultFailure(
  consecutiveFailures: number,
  limit: number = VAULT_FAILURE_LIMIT,
): "cancelled" | "unusable" {
  return consecutiveFailures >= limit ? "unusable" : "cancelled";
}
