import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as authLogin,
  loginViaAdmin,
  logout as authLogout,
  getAuthToken,
  clearSession,
} from "./auth";

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      setIsAuthenticated(!!token);
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        // Try mobile auth first, fall back to admin session auth
        let result = await authLogin(email, password);
        if (!result.success) {
          result = await loginViaAdmin(email, password);
        }
        setIsAuthenticated(result.success);
        return result;
      } catch (err: any) {
        return { success: false, message: err.message };
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
