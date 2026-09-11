import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setAccessToken, tryRefresh } from "../api/client";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load there is no access token in memory (by design — it's
  // never persisted). We attempt a silent refresh using the HttpOnly
  // cookie; if it succeeds the session resumes without asking for
  // credentials again.
  useEffect(() => {
    (async () => {
      const ok = await tryRefresh();
      if (ok) {
        try {
          const { user } = await api.get<{ user: User }>("/api/auth/me");
          setUser(user);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ accessToken: string; user: User }>("/api/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await api.post("/api/auth/logout");
    setAccessToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
