import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/User";
import { LoginSchema } from "@/lib/validators";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = LoginSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { username, password } = parsed.data;
          await connectDB();

          const user = await UserModel.findOne({
            username,
            active: true,
          }).lean();
          if (!user) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          // Convert Mongoose Map to plain object here, before any serialization
          const allowedGroups: Record<string, string[] | "*"> = {};
          if (user.allowedGroups) {
            const entries = Object.entries(user.allowedGroups as object);
            for (const [k, v] of entries) {
              allowedGroups[k] = v as string[] | "*";
            }
          }

          return {
            id: user._id.toString(),
            name: user.displayName ?? user.username,
            email: user.email,
            username: user.username,
            role: user.role,
            displayName: user.displayName ?? null,
            customers: user.customers ?? [],
            allowedGroups,
            businessUnit: user.businessUnit ?? null,
            isExecutive: user.isExecutive ?? false,
            isCustomerManager: user.isCustomerManager ?? false,
            managedCustomers: user.managedCustomers ?? [],
            active: user.active,
          };
        } catch (err) {
          console.error("[auth] authorize() threw:", err);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Cast to any to access our custom fields
        const u = user as any;
        token.uid = u.id;
        token.username = u.username;
        token.role = u.role;
        token.displayName = u.displayName;
        token.customers = u.customers;
        token.allowedGroups = u.allowedGroups;
        token.businessUnit = u.businessUnit;
        token.isExecutive = u.isExecutive;
        token.isCustomerManager = u.isCustomerManager;
        token.managedCustomers = u.managedCustomers;
        token.active = u.active;
      }
      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.uid as string,
          name: token.name as string,
          email: token.email as string,
          username: token.username as string,
          role: token.role as string,
          displayName: token.displayName as string | null,
          customers: token.customers as string[],
          allowedGroups: token.allowedGroups as Record<string, string[] | "*">,
          businessUnit: token.businessUnit as string | null,
          isExecutive: token.isExecutive as boolean,
          isCustomerManager: token.isCustomerManager as boolean,
          managedCustomers: token.managedCustomers as string[],
          active: token.active as boolean,
        },
      };
    },
  },

  secret: process.env["NEXTAUTH_SECRET"],
  debug: process.env["NODE_ENV"] === "development",
};
