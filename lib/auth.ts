import NextAuth from "next-auth";
import Notion from "next-auth/providers/notion";
if (!process.env.AUTH_URL) {
  throw new Error(
    "AUTH_URL is missing. Set AUTH_URL=http://localhost:3000 in .env"
  );
}
if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
  throw new Error("NOTION_CLIENT_ID/SECRET missing in .env");
}
console.log("[Auth] AUTH_URL =", process.env.AUTH_URL); // should print http://localhost:3000

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Notion({
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
      redirectUri: `${process.env.AUTH_URL}/api/auth/callback/notion`,
    }),
  ],
});
