// pages/auth/notion.tsx
import { NextApiRequest, NextApiResponse } from 'next';
import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';

export default NextAuth({
  providers: [
    Providers.Credentials({
      name: 'Notion',
      credentials: {
        token: { label: 'Notion Token', type: 'text' },
      },
      async authorize(credentials: { token: string }) {
        // You can perform additional validation here if needed
        return Promise.resolve({ id: credentials.token, name: 'Notion User' });
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt(token, user) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
  },
  session: {
    jwt: true,
  },
});
