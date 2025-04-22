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
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds (this value is also the default)
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
      return baseUrl + "/auth/sign-in";
    },
    async jwt({ token, trigger, session, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.id = user.id;
        token.image = user.image;
        token.role = user.role;
        await clearStaleTokens();
      } else if (trigger === "update" && session?.name) {
        token.email = user["email"];
        token.name = user["name"];
        token.id = user["id"];
        token.image = user["image"];
        token.isActive = user["isActive"];
        token.role = user["role"];
        await clearStaleTokens();
      }
      return token;
    },
    async session({ session, token }) {
      await dbConnect();
      const userEmail = session?.user?.email;
      const dbUser = await User.findOne({ email: userEmail });

      if (dbUser) {
        session.user.email = dbUser.email;
        session.user.name = dbUser.name;
        session.user.id = dbUser.id;
        session.user.image = dbUser.image ?? null;
        session.user.role = dbUser.role;
      } else {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.id = token.id;
        session.user.image = token.image;
        session.user.role = token.role;
      }
      return session;
    },
  },
} as NextAuthOptions;
