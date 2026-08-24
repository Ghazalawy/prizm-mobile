import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import Toast from "react-native-toast-message";
import {
  login as authLogin,
  loginViaApi,
  logout as authLogout,
  getAuthToken,
  clearSession,
  getStaffProfile,
  type StaffProfile,
} from "./auth";
import {
  resolveBiometricGate,
  promptBiometric,
  hasAskedAboutBiometric,
  unlockBiometricCredentials,
  saveBiometricCredentials,
  keepBiometricCredentialsForAccount,
  clearBiometricVault,
} from "./biometric";
import {
  resolveBiometricOffer,
  shouldShowBiometricButton,
  type BiometricOfferReason,
} from "./biometric-policy";
import {
  setInvalidTokenHandler,
  resetInvalidTokenDebounce,
} from "./auth-events";
import { queryClient } from "./query-client";
import { API_URL } from "./config";
import { isInvalidTokenResponse } from "./api";

export type { BiometricOfferReason } from "./biometric-policy";

type LoginResult = {
  success: boolean;
  message?: string;
  /** The attempt never reached the server — not a credential problem. */
  networkError?: boolean;
  /** True when this device can use fingerprint sign-in but isn't set up for
   * it: either we've never asked, or the user opted in and the protected
   * credential is missing (upgraded install, account switch, OS key wiped).
   * The login screen uses this to show the "Enable fingerprint?" alert. */
  shouldOfferBiometric?: boolean;
  /** Distinguishes a first-ever offer from restoring a feature the user had
   * already turned on — the wording and the "Not now" behaviour differ. */
  biometricOfferReason?: BiometricOfferReason;
};

export type BiometricRetryResult = {
  ok: boolean;
  /**
   * - `cancelled`  — user dismissed the OS prompt; retrying is fine.
   * - `unusable`   — the protected credential is gone (Android destroys the
   *                  keystore key when fingerprints or the lock screen
   *                  change). Needs one password sign-in to restore.
   * - `rejected`   — the stored credential no longer authenticates, e.g. the
   *                  password was changed on the web.
   * - `offline`    — the sign-in request never reached the server, so the
   *                  stored credential is still presumed good.
   * - `unavailable`— no enrolled biometric, or the feature is off.
   */
  reason?: "cancelled" | "unusable" | "rejected" | "offline" | "unavailable";
};

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Current staff profile (staffid + name + email). Null until login completes
   * or while the persisted profile is being hydrated from SecureStore. */
  currentUser: StaffProfile | null;
  /** True when this device can sign in with a fingerprint and simply hasn't
   *  yet. The login screen uses this to render the "Use fingerprint" button. */
  biometricPending: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Re-prompt biometric. `ok` is true when the user is now logged in. */
  retryBiometric: () => Promise<BiometricRetryResult>;
  /** Verify the current account password and protect it with the OS biometric
   * vault so fingerprint can obtain a fresh JWT after a real expiry. */
  enableBiometric: (password: string) => Promise<LoginResult>;
  /** Re-read the durable biometric state from SecureStore. The login screen
   * calls this on mount/focus so the fingerprint button appears no matter
   * which code path routed the user there. */
  refreshBiometricState: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Can the login screen offer a fingerprint path right now?
 *
 * With a token still on the device the OS prompt alone unlocks the app, so the
 * opt-in is enough. With no token only a stored credential can obtain a fresh
 * JWT, so the vault must exist too. Every caller uses this one function —
 * hand-assembling the flag per call site is what silently dropped the button.
 */
async function computeBiometricPending(): Promise<boolean> {
  const [gate, token] = await Promise.all([resolveBiometricGate(), getAuthToken()]);
  return shouldShowBiometricButton(gate, !!token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);
  // True when this device can take a fingerprint on the login screen. Kept in
  // sync with SecureStore rather than inferred from how the user got here.
  const [biometricPending, setBiometricPending] = useState(false);

  const refreshBiometricState = useCallback(async () => {
    setBiometricPending(await computeBiometricPending());
  }, []);

  // On mount: if a token exists, validate it with a quick server check,
  // then optionally gate behind biometric.
  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      if (!token) {
        setBiometricPending(await computeBiometricPending());
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Quick server-side token validation before trusting the stored token.
      // This prevents the "sign in → immediately kicked out" loop caused by
      // stale tokens from before a server update or JWT key rotation.
      try {
        const res = await fetch(`${API_URL}/my/tasks-summary`, {
          headers: { "Content-Type": "application/json", authtoken: token },
        });
        const body = await res.json().catch(() => null);
        if (isInvalidTokenResponse(res.status, body, true)) {
          // Token is genuinely expired/invalid — clear it.
          await clearSession();
          setBiometricPending(await computeBiometricPending());
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      } catch {
        // Network error — allow offline use with cached token
      }

      // App-open lock. This gates on the opt-in alone: the token is already
      // valid, so the OS prompt is the only thing being asked for. Requiring
      // a credential vault here would silently unlock the app for everyone
      // who enabled fingerprint before the vault existed.
      const gate = await resolveBiometricGate();
      if (gate.optedIn && gate.available) {
        const ok = await promptBiometric();
        if (!ok) {
          setBiometricPending(true);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      }

      setIsAuthenticated(true);
      setBiometricPending(false);
      resetInvalidTokenDebounce();
      const profile = await getStaffProfile();
      if (profile) setCurrentUser(profile);
      setIsLoading(false);
    })();
  }, []);

  // Register the global "token invalid" handler exactly once. When a fetch
  // anywhere in the app sees a "Signature verification failed" response (or
  // any other invalid-token signal — see lib/api.ts), it calls notifyInvalid
  // Token() which lands here: clear the cached session, kill react-query
  // caches, and let the Redirect in (tabs)/_layout.tsx route to /login.
  useEffect(() => {
    setInvalidTokenHandler(async () => {
      // Only tear the session down once. A second handler run (or one that
      // races the boot-time validation) has nothing left to clear.
      const currentToken = await getAuthToken();
      if (currentToken) {
        await clearSession().catch(() => undefined);
        queryClient.cancelQueries();
        queryClient.clear();
        Toast.show({
          type: "info",
          text1: "Session expired",
          text2: "Please sign in again to continue.",
        });
      }

      // Always refresh the visible state, even when the token was already
      // gone: returning early here left the login screen showing a bare
      // password form to users who had fingerprint sign-in set up.
      setIsAuthenticated(false);
      setCurrentUser(null);
      setBiometricPending(await computeBiometricPending());
    });
    return () => setInvalidTokenHandler(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setIsLoading(true);
      try {
        // Try the standalone mobile endpoint first, then the CSRF-exempt REST
        // login route. Native authentication never depends on admin cookies.
        let result = await authLogin(email, password);
        if (!result.success) {
          result = await loginViaApi(email, password);
        }

        if (result.success) {
          // Discards a vault that belongs to a different staff account (and
          // keeps the opt-in, so the offer below covers the new account).
          await keepBiometricCredentialsForAccount(email);

          // Offer setup when fingerprint can't currently sign this device in:
          // either the user already asked for it and the credential is
          // missing, or we've never raised the question at all.
          const [gate, askedBefore] = await Promise.all([
            resolveBiometricGate(),
            hasAskedAboutBiometric(),
          ]);
          const offerReason = resolveBiometricOffer(gate, askedBefore);

          // Cancel any in-flight queries from a previous (stale) session
          // so their "Signature verification failed" responses don't arrive
          // after this fresh login and trigger another kick-out.
          await queryClient.cancelQueries();
          queryClient.clear();
          // Fresh token → allow the invalid-token kick-out to fire again
          // next time something goes wrong.
          resetInvalidTokenDebounce();
          setIsAuthenticated(true);
          setBiometricPending(false);
          // Pick up the staff profile that authLogin just persisted.
          const profile = await getStaffProfile();
          if (profile) setCurrentUser(profile);
          return {
            ...result,
            shouldOfferBiometric: !!offerReason,
            biometricOfferReason: offerReason ?? undefined,
          };
        }

        setIsAuthenticated(false);
        return result;
      } catch (err: any) {
        setIsAuthenticated(false);
        return { success: false, message: err?.message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /** Re-prompt biometric. With a stored token the OS prompt is enough; after a
   *  real expiry the protected credential fetches a fresh JWT. */
  const retryBiometric = useCallback(async (): Promise<BiometricRetryResult> => {
    const gate = await resolveBiometricGate();
    if (!gate.available || !gate.optedIn) return { ok: false, reason: "unavailable" };

    const token = await getAuthToken();
    if (token) {
      const ok = await promptBiometric();
      if (!ok) return { ok: false, reason: "cancelled" };
    } else {
      if (!gate.canSignIn) return { ok: false, reason: "unusable" };
      // A fingerprint is useful after a real token expiry only if it can
      // authenticate again. The OS-gated vault supplies the credentials and
      // the normal login endpoint issues a fresh JWT.
      const unlocked = await unlockBiometricCredentials();
      if (!unlocked.ok) {
        if (unlocked.reason === "unusable") {
          setBiometricPending(await computeBiometricPending());
        }
        return { ok: false, reason: unlocked.reason };
      }
      const { email, password } = unlocked.credentials;
      let result = await authLogin(email, password);
      if (!result.success) {
        result = await loginViaApi(email, password);
      }
      if (!result.success) {
        // Offline is not a rejection. Discarding a working credential because
        // the phone lost signal would be its own bug.
        if (result.networkError) return { ok: false, reason: "offline" };
        // The stored password no longer authenticates (changed on the web).
        // Keeping it would fail on every future attempt, so drop it and let
        // the next password sign-in offer enrolment again.
        await clearBiometricVault();
        setBiometricPending(await computeBiometricPending());
        return { ok: false, reason: "rejected" };
      }
      await queryClient.cancelQueries();
      queryClient.clear();
    }

    setIsAuthenticated(true);
    setBiometricPending(false);
    resetInvalidTokenDebounce();
    const profile = await getStaffProfile();
    if (profile) setCurrentUser(profile);
    return { ok: true };
  }, []);

  const enableBiometric = useCallback(async (password: string): Promise<LoginResult> => {
    const profile = currentUser ?? (await getStaffProfile());
    if (!profile?.email || !password) {
      return { success: false, message: "Enter your current password." };
    }

    let result = await authLogin(profile.email, password);
    if (!result.success) {
      result = await loginViaApi(profile.email, password);
    }
    if (!result.success) return result;

    try {
      await saveBiometricCredentials(profile.email, password);
      setBiometricPending(false);
      return { success: true };
    } catch {
      return { success: false, message: "Fingerprint protection could not be enabled." };
    }
  }, [currentUser]);

  const logout = useCallback(async () => {
    await authLogout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setBiometricPending(await computeBiometricPending());
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, currentUser, biometricPending, login, retryBiometric, enableBiometric, refreshBiometricState, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

/** Shortcut: just the currently logged-in staff record. Returns null while
 * loading or if no one is logged in. */
export function useCurrentUser(): StaffProfile | null {
  return useAuth().currentUser;
}
