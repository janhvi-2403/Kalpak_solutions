'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from './api-client';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  mfaEnabled: boolean;
  emailVerified: boolean;
}

export interface ActiveTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings?: Record<string, any>;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

export interface SessionData {
  user: CurrentUser;
  activeTenantId: string | null;
  activeRole: string | null;
  activeTenant: ActiveTenant | null;
  permissions: string[];
  mfaVerified: boolean;
  memberships: TenantMembership[];
}

interface AuthContextType {
  user: CurrentUser | null;
  activeTenant: ActiveTenant | null;
  activeRole: string | null;
  permissions: string[];
  memberships: TenantMembership[];
  mfaVerified: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refetchSession: () => Promise<SessionData | null>;
  switchTenant: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSession = useCallback(async (): Promise<SessionData | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient<SessionData>('/auth/me');
      setSession(data);
      return data;
    } catch (err) {
      if (err instanceof ApiClientError && (err.statusCode === 401 || err.statusCode === 403)) {
        setSession(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to retrieve active session');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      try {
        setIsLoading(true);
        await apiClient('/tenants/switch', {
          method: 'POST',
          body: JSON.stringify({ tenantId }),
        });
        await fetchSession();
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch tenant';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSession, router]
  );

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await apiClient('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore error during logout to guarantee client-side cleanup
    } finally {
      setSession(null);
      setIsLoading(false);
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        activeTenant: session?.activeTenant ?? null,
        activeRole: session?.activeRole ?? null,
        permissions: session?.permissions ?? [],
        memberships: session?.memberships ?? [],
        mfaVerified: session?.mfaVerified ?? false,
        isLoading,
        isAuthenticated: !!session?.user,
        error,
        refetchSession: fetchSession,
        switchTenant,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
