"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "./api";
import type { Role, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Espace d'accueil de chaque rôle (F03). */
export function homeFor(role: Role): string {
  return role === "tenant" ? "/tenant" : "/owner";
}

/** Cookie lisible par middleware.ts pour rediriger sans attendre l'API (la vraie sécurité reste côté API). */
function setRoleCookie(role: Role | null) {
  document.cookie = role
    ? `lg_role=${role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : "lg_role=; path=/; max-age=0";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    setRoleCookie(u?.role ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ data: User }>("/user");
      setUser(res.data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }, [router, setUser]);

  return <AuthContext.Provider value={{ user, loading, setUser, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
