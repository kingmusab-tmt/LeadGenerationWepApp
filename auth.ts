import Google from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import client from "./lib/db";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { clearStaleTokens } from "./lib/clearStaleTokensServerAction";
import { NextAuthOptions } from "next-auth";
import dbConnect from "./lib/connectdb";
import { User } from "./models";
import { Buyer } from "./models/leadbuyers";
import { createTransport } from "nodemailer";
import { getCachedSession } from "./lib/cachedSession";

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
    async signIn({ user, account }) {
      try {
        if (!user?.email) return true;

        await dbConnect();

        const now = new Date();
        const provider = account?.provider || "google";

        const setData: Record<string, unknown> = {
          lastLogin: now,
          updatedAt: now,
        };

        if (user.name) setData.name = user.name;
        if (user.image) setData.image = user.image;

        await User.updateOne(
          { email: user.email },
          {
            $set: setData,
            $setOnInsert: {
              email: user.email,
              provider,
              role: "user",
              status: "active",
              createdAt: now,
            },
          },
          { upsert: true },
        );

        await User.updateOne(
          { email: user.email, createdAt: { $exists: false } },
          { $set: { createdAt: now } },
        );

        await User.updateOne(
          { email: user.email, provider: { $exists: false } },
          { $set: { provider } },
        );

        return true;
      } catch (error) {
        console.error(
          "[auth.signIn] Failed to sync user login metadata",
          error,
        );
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },

    async jwt({ token, trigger, session, user, account }) {
      if (user) {
        // Initial sign in - set basic profile data
        token.email = user.email;
        token.name = user.name;
        token.id = user.id;
        token.image = user.image;
        token.role = user.role;
        token.isSubActive = user.isSubActive;
        if (Date.now() % 10 === 0) await clearStaleTokens(); // ~10% of the time
      } else if (trigger === "update" && session?.name) {
        // Manual session update triggered
        token.email = session.user?.email;
        token.name = session.user?.name;
        token.id = session.user?.id;
        token.image = session.user?.image;
        token.isActive = session.user?.isActive;
        token.role = session.user?.role;
        token.isSubActive = session.user?.isSubActive;
        if (Date.now() % 10 === 0) await clearStaleTokens();
      }

      // ALWAYS fetch fresh user data from database to ensure token is up-to-date
      // This runs on initial sign-in AND on every subsequent request
      // This ensures changes like subscription updates are reflected immediately
      if (token.email) {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email as string })
          .select("role subscription")
          .lean();

        if (dbUser) {
          // Check if user is a registered buyer but still has "user" role
          if (dbUser.role === "user") {
            const existingBuyer = await Buyer.findOne({
              email: token.email as string,
            })
              .select("_id")
              .lean();

            if (existingBuyer) {
              // Automatically assign buyer role
              await User.updateOne(
                { email: token.email as string },
                { $set: { role: "buyer" } },
              );
              dbUser.role = "buyer";
              console.log(
                "[JWT] Auto-assigned buyer role to:",
                token.email,
                "- found in Buyer collection",
              );
            }
          }

          // Update token with latest data from database
          token.role = dbUser.role;
          token.isSubActive =
            dbUser.subscription?.isSubscriptionActive || false;
          console.log("[JWT] Fetched fresh data from DB:", {
            email: token.email,
            role: dbUser.role,
            isSubActive: dbUser.subscription?.isSubscriptionActive || false,
          });
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Use Redis-backed caching for sessions
      // This reduces database queries from 100% to ~1%
      const userEmail = typeof token?.email === "string" ? token.email : "";
      if (!userEmail) {
        return null;
      }

      const cachedSessionData = await getCachedSession(userEmail, token);

      if (!cachedSessionData) {
        // User deleted – invalidate session
        return null;
      }

      // Use cached data as base, but ALWAYS prefer JWT token for critical auth fields
      // The JWT callback fetches fresh data from DB on every request
      session.user = {
        ...cachedSessionData,
        // Override with token data to ensure freshness for auth-critical fields
        role: (token.role as string) || cachedSessionData.role,
        isSubActive:
          typeof token.isSubActive === "boolean"
            ? token.isSubActive
            : cachedSessionData.isSubActive,
      };
      return session;
    },
  },
} as NextAuthOptions;
