import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          allowPlayerLinking: user.allowPlayerLinking,
          showEmailInSearch: user.showEmailInSearch,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.allowPlayerLinking = user.allowPlayerLinking;
        token.showEmailInSearch = user.showEmailInSearch;
      }
      // Handle session update from client
      if (trigger === "update" && session) {
        token.allowPlayerLinking = session.allowPlayerLinking ?? token.allowPlayerLinking;
        token.showEmailInSearch = session.showEmailInSearch ?? token.showEmailInSearch;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.allowPlayerLinking = token.allowPlayerLinking as boolean;
        session.user.showEmailInSearch = token.showEmailInSearch as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to change password if required
      if (url.includes('/change-password')) {
        return url;
      }
      return baseUrl;
    },
  },
};
