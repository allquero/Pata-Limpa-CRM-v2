import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { useGetMyTenant, getGetMyTenantQueryKey } from "@workspace/api-client-react";
import type { Tenant } from "@workspace/api-client-react";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
}

export type AccessStatus = "active" | "expired" | "not_started" | null;

function computeAccessStatus(tenant: Tenant | null): AccessStatus {
  if (!tenant) return null;
  const t = tenant as Tenant & { accessStart?: string | null; accessEnd?: string | null };
  if (!t.accessStart || !t.accessEnd) return "active";
  const today = new Date().toISOString().slice(0, 10);
  if (today < t.accessStart) return "not_started";
  if (today > t.accessEnd) return "expired";
  return "active";
}

interface AuthContextValue {
  user: AuthUser | null;
  tenant: Tenant | null;
  tenantId: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasTenant: boolean;
  accessStatus: AccessStatus;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("not authenticated");
      const data = (await res.json()) as { user: AuthUser | null; isAdmin?: boolean };
      setUser(data.user ?? null);
      setIsAdmin(data.isAdmin ?? false);
    } catch {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const isAuthenticated = user !== null;

  const { data: tenantData, isLoading: tenantLoading } = useGetMyTenant({
    query: {
      queryKey: getGetMyTenantQueryKey(),
      enabled: isAuthenticated && !isAdmin,
      retry: false,
    },
  });

  const tenant = tenantData?.tenant ?? null;
  const isLoading = authLoading || (isAuthenticated && !isAdmin && tenantLoading);
  const accessStatus = computeAccessStatus(tenant);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          return { error: data.error ?? "Credenciais inválidas" };
        }
        await fetchUser();
        return {};
      } catch {
        return { error: "Erro de conexão. Tente novamente." };
      }
    },
    [fetchUser],
  );

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
      setUser(null);
      setIsAdmin(false);
      window.location.href = "/";
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        tenantId: tenant?.id ?? null,
        isLoading,
        isAuthenticated,
        isAdmin,
        hasTenant: tenant !== null,
        accessStatus,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAppAuth must be used within AuthProvider");
  return ctx;
}
