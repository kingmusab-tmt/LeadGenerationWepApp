import Google from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import client from "./lib/db";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { clearStaleTokens } from "./lib/clearStaleTokensServerAction";
import { NextAuthOptions } from "next-auth";
import dbConnect from "./lib/connectdb";
import { User } from "./models/user";
import { createTransport } from "nodemailer";

export const authOptions = {
  adapter: MongoDBAdapter(client),
  secret: process.env.AUTH_SECRET as string, // Used to sign the session cookie so AuthJS can verify the session

  session: {
    strategy: "jwt",
    maxAge: 1 * 24 * 60 * 60, // 1 days in seconds (this value is also the default)
    updateAge: 60 * 60, // Re-issue token every 24 hours
  },
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/auth-success",
    error: "/auth/auth-error",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
      async profile(profile) {
        return {
          id: profile.sub,
          username: profile.sub,
          email: profile.email,
          emailVerified: profile.email_verified,
          name: profile.name,
          image: profile.picture,
          role: profile.role || "user",
          isSubActive: false,
          provider: profile.provider ?? "google",
        };
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: 465,
        auth: {
          user: process.env.EMAIL_FROM!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM as string,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { host } = new URL(url);
        const transport = createTransport(provider.server);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Sign in to ${host}`,
          text: `Sign in by clicking on the link below:\n\n${url}\n\n`,
          html: `<p>Sign in by clicking on the link below:</p><p><a href="${url}">Sign in</a></p>`,
        });
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },

    async jwt({ token, trigger, session, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.id = user.id;
        token.image = user.image;
        token.role = user.role;
        token.isSubActive = user.isSubActive;
        if (Date.now() % 10 === 0) await clearStaleTokens(); // ~10% of the time
      } else if (trigger === "update" && session?.name) {
        token.email = session.user?.email;
        token.name = session.user?.name;
        token.id = session.user?.id;
        token.image = session.user?.image;
        token.isActive = session.user?.isActive;
        token.role = session.user?.role;
        token.isSubActive = session.user?.isSubActive;
        if (Date.now() % 10 === 0) await clearStaleTokens();
      }
      return token;
    },

    async session({ session, token }) {
      await dbConnect();
      const userEmail = token?.email;
      const dbUser = await User.findOne({ email: userEmail });

      if (!dbUser) {
        // User deleted – invalidate session
        return null;
      }

      session.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image ?? null,
        role: dbUser.role,
        isSubActive: dbUser.subscription?.isSubscriptionActive,
      };

      return session;
    },
  },
} as NextAuthOptions;
