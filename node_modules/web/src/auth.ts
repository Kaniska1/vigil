import NextAuth from "next-auth";

import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import {
  PrismaAdapter,
} from "@auth/prisma-adapter";

import prisma from "@/lib/prisma";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    GitHub,
    Google,
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "database",
  },

  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id =
          user.id;
      }

      return session;
    },
  },
});