import { createContext, useContext, ReactNode } from "react";
import { useAuth, type AuthUser } from "@workspace/replit-auth-web";
import { useGetMyTenant, getGetMyTenantQueryKey } from "@workspace/api-client-react";
import type { Tenant } from "@workspace/api-client-react";

export type AccessStatus = "active" | "pending" | "expired" | "not_started" | null;

function computeAccessStatus(tenant: Tenant | null): AccessStatus {
  if (!tenant) return null;
  const t = tenant as Tenant & { accessStart?: string | null; accessEnd?: string | null };
  if (!t.accessStart || !t.accessEnd) return "pending";
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
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();

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
