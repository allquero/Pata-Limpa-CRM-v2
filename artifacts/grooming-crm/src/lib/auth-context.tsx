import { createContext, useContext, ReactNode } from "react";
import { useAuth, type AuthUser } from "@workspace/replit-auth-web";
import { useGetMyTenant, getGetMyTenantQueryKey } from "@workspace/api-client-react";
import type { Tenant } from "@workspace/api-client-react";

interface AuthContextValue {
  user: AuthUser | null;
  tenant: Tenant | null;
  tenantId: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasTenant: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();

  const { data: tenantData, isLoading: tenantLoading } = useGetMyTenant({
    query: {
      queryKey: getGetMyTenantQueryKey(),
      enabled: isAuthenticated,
      retry: false,
    },
  });

  const tenant = tenantData?.tenant ?? null;
  const isLoading = authLoading || (isAuthenticated && tenantLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        tenantId: tenant?.id ?? null,
        isLoading,
        isAuthenticated,
        hasTenant: tenant !== null,
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
