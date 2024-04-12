import NextAuth from "next-auth";
import Notion from "next-auth/providers/notion";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // keep JWT sessions
  providers: [
    Notion({
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
      redirectUri: `${process.env.AUTH_URL}/api/auth/callback/notion`,
    }),
  ],
  callbacks: {
    // ✅ put the DB user id onto session.user.id
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub; // token.sub is the user id
      }
      return session;
    },

    // (optional safety) ensure token.sub is set on first sign-in
    async jwt({ token, user }) {
      if (user?.id) token.sub = String(user.id);
      return token;
    },
  },
});
