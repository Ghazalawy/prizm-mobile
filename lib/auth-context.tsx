import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import Toast from "react-native-toast-message";
import {
  login as authLogin,
  loginViaAdmin,
  logout as authLogout,
  getAuthToken,
  clearSession,
  getStaffProfile,
  type StaffProfile,
} from "./auth";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  promptBiometric,
  hasAskedAboutBiometric,
} from "./biometric";
import {
  setInvalidTokenHandler,
  resetInvalidTokenDebounce,
} from "./auth-events";
import { queryClient } from "./query-client";
import { API_URL } from "./config";

type LoginResult = {
  success: boolean;
  message?: string;
  /** True only on the FIRST successful password login on a device with biometric
   * hardware enrolled and the user hasn't been asked yet. The login screen uses
   * this to show the one-time "Enable fingerprint?" alert. */
  shouldOfferBiometric?: boolean;
};

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Current staff profile (staffid + name + email). Null until login completes
   * or while the persisted profile is being hydrated from SecureStore. */
  currentUser: StaffProfile | null;
  /** True when a token + enabled biometric exist and the user just hasn't
   *  passed the biometric prompt yet. Login screen uses this to render
   *  the "Use fingerprint" retry button. */
  biometricPending: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Re-prompt biometric. Resolves to true on success → user is logged in. */
  retryBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);
  // True when there's still a valid token in SecureStore + biometric enabled,
  // but the user cancelled / failed the prompt. Used by the login screen to
  // render a "Use fingerprint" retry button.
  const [biometricPending, setBiometricPending] = useState(false);

  // On mount: if a token exists, validate it with a quick server check,
  // then optionally gate behind biometric.
  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      if (!token) {
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
        if (res.status === 401) {
          await clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        const body = await res.json().catch(() => null);
        if (
          body &&
          body.status === false &&
          typeof body.message === "string" &&
          /signature verification failed|token expired/i.test(body.message)
        ) {
          await clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      } catch {
        // Network error — allow offline use with cached token
      }

      const biometricOn = await isBiometricEnabled();
      if (biometricOn && (await isBiometricAvailable())) {
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
      // Guard against stale in-flight responses from a previous session:
      // if the token was already cleared (by a prior handler or by the
      // boot-time validation), don't clear the session again — a fresh
      // login may have already stored a new valid token.
      const currentToken = await getAuthToken();
      if (!currentToken) return;

      await clearSession().catch(() => undefined);
      queryClient.cancelQueries();
      queryClient.clear();
      setIsAuthenticated(false);
      setCurrentUser(null);
      Toast.show({
        type: "info",
        text1: "Session expired",
        text2: "Please sign in again to continue.",
      });
    });
    return () => setInvalidTokenHandler(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setIsLoading(true);
      try {
        // Try mobile_auth.php first, fall back to admin session auth
        let result = await authLogin(email, password);
        if (!result.success) {
          result = await loginViaAdmin(email, password);
        }

        if (result.success) {
          // First-time-only biometric offer
          let shouldOffer = false;
          if (await isBiometricAvailable()) {
            const askedBefore = await hasAskedAboutBiometric();
            const alreadyOn   = await isBiometricEnabled();
            shouldOffer = !askedBefore && !alreadyOn;
          }
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
          return { ...result, shouldOfferBiometric: shouldOffer };
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

  /** Re-prompt biometric. Only valid when there's still a stored token
   *  (i.e. the boot-time check pended without clearing the session).
   *  Returns true on success → user is logged in. */
  const retryBiometric = useCallback(async (): Promise<boolean> => {
    const token = await getAuthToken();
    if (!token) return false;
    if (!(await isBiometricAvailable())) return false;
    if (!(await isBiometricEnabled())) return false;
    const ok = await promptBiometric();
    if (!ok) return false;
    setIsAuthenticated(true);
    setBiometricPending(false);
    const profile = await getStaffProfile();
    if (profile) setCurrentUser(profile);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setBiometricPending(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, currentUser, biometricPending, login, retryBiometric, logout }}>
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
