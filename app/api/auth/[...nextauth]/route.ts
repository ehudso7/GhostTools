import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { env } from '@/lib/env-validation';
import { prisma } from '@/lib/prisma';

/**
 * NextAuth configuration with proper email and OAuth providers
 */
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: env().EMAIL_SERVER || {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: env().EMAIL_FROM || 'noreply@ghosttools.com',
    }),
    // Google provider is optional - only include if it's configured
    ...(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env().GOOGLE_CLIENT_ID,
            clientSecret: env().GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Add user ID to the JWT token when logging in
      if (user) {
        token.userId = user.id;
      }
      // Add provider access token if available
      if (account) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token && session.user) {
        session.user.id = token.userId as string;
      }
      
      // Add custom user data from database
      if (session.user?.email) {
        try {
          const userData = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
              credits: true,
              subscriptions: {
                where: { status: 'active' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
          
          if (userData) {
            // Add user credits to session
            session.user.credits = userData.credits?.amount || 0;
            
            // Add active subscription status
            session.user.subscription = userData.subscriptions[0]
              ? {
                  plan: userData.subscriptions[0].planId,
                  status: userData.subscriptions[0].status,
                  validUntil: userData.subscriptions[0].endDate?.toISOString(),
                }
              : null;
          }
        } catch (error) {
          console.error('Error fetching user data for session:', error);
        }
      }
      
      return session;
    },
  },
  events: {
    // Initialize credits for new users
    async createUser({ user }) {
      await prisma.credits.create({
        data: {
          userId: user.id,
          amount: 5, // Give 5 free credits to new users
        },
      });
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };