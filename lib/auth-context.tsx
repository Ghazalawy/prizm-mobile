import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);

  // On mount: if a token exists, optionally gate it behind biometric.
  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const biometricOn = await isBiometricEnabled();
      if (biometricOn && (await isBiometricAvailable())) {
        const ok = await promptBiometric();
        if (!ok) {
          // User cancelled or failed — clear session and force password
          await clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      }

      setIsAuthenticated(true);
      // Hydrate the persisted staff profile so currentUser is available on
      // app boot without waiting for a fresh login.
      const profile = await getStaffProfile();
      if (profile) setCurrentUser(profile);
      setIsLoading(false);
    })();
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
          setIsAuthenticated(true);
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

  const logout = useCallback(async () => {
    await authLogout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, currentUser, login, logout }}>
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
