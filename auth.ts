import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Google sign-in with signed cookies (JWT), so no user table is needed. The user's
// id is Google's stable account id, which owns their practice sessions.
// Reads AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
