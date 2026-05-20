import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as authLogin,
  loginViaAdmin,
  logout as authLogout,
  getAuthToken,
  clearSession,
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
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
