import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      role?: string | null;
      provider: string | null;
      image: string | null;
      isSubActive: boolean | null;
      id: string | null;
    } & DefaultSession["seller"];
  }
  interface Session {
    id: string | null;
    role: string | null;
    image: string | null;
    isSubActive: boolean | null;
  }

  interface User {
    id: string | null;
    role: string | null;
    image: string | null;
    isSubActive: boolean | null;
    provider: string | null;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string | null;
    role: string | null;
    image: string | null;
    isSubActive: boolean | null;
    provider: string | null;
  }
}
