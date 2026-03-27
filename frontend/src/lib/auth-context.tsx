"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout, ApiError } from "@/lib/api";
import type { UserMe } from "@/lib/api";

interface AuthContextValue {
  user: UserMe | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {
        setUser(null);
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace("/login");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoading && !user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    }
  }, [user, isLoading, pathname]);

  const login = useCallback(async (email: string, password: string) => {
    const me = await apiLogin(email, password);
    setUser(me);
    router.replace("/");
  }, [router]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const me = await apiRegister(email, password, displayName);
    setUser(me);
    router.replace("/");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
