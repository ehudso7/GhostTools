import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { useSession, signIn, signOut } from 'next-auth/react';

type UserSession = Session & {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
};

type UserDetails = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  credits?: number;
  hasSubscription?: boolean;
  subscriptionPlan?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserDetails | null;
  signIn: (provider?: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUserDetails: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  fetchUserDetails: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserDetails | null>(null);

  // Helper function to fetch user details from the API
  const fetchUserDetails = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user');
      
      if (response.ok) {
        const data = await response.json();
        setUser({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          credits: data.credits,
          hasSubscription: data.hasSubscription,
          subscriptionPlan: data.subscriptionPlan,
        });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Initial user setup when session changes
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      });
      
      fetchUserDetails();
    } else {
      setUser(null);
    }
  }, [session]);

  // Sign in function
  const handleSignIn = async (provider = 'email') => {
    await signIn(provider);
  };

  // Sign out function
  const handleSignOut = async () => {
    setUser(null);
    await signOut({ callbackUrl: '/' });
  };

  const value = {
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    user,
    signIn: handleSignIn,
    signOut: handleSignOut,
    fetchUserDetails,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;