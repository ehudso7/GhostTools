'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface UserData {
  id: string;
  name?: string | null;
  email?: string | null;
  credits: number;
  subscription?: {
    status: string;
    planId: string;
    endDate?: Date;
  } | null;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  refreshUserData: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch('/api/user');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    setLoading(true);
    await fetchUserData();
  };

  const logout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    
    if (status === 'authenticated' && session?.user) {
      fetchUserData();
    } else {
      setLoading(false);
      setUser(null);
    }
  }, [status, session]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUserData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}