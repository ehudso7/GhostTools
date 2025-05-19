'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { Analytics } from '@vercel/analytics/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        {children}
        <Analytics />
      </AuthProvider>
    </SessionProvider>
  );
}