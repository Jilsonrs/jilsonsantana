import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { Role } from "@jilson/core";

// Better Auth instance (Phase 1). The HTTP handler is mounted on Express in
// index.ts via toNodeHandler — see the middleware-order note there.
//
// Conventions (see CLAUDE.md → Better Auth):
// - Prisma adapter on Supabase Postgres; Prisma is the sole DB accessor.
// - Email/password + database sessions (the generated `session` table).
// - Public sign-up stays closed (`disableSignUp: true`): users are created by a
//   trusted trigger (admin/test-member seed in Bloco 3, Stripe webhook in P4),
//   never self-registration.
// - `role` is a custom additionalField storing the lowercase values from the
//   shared `Role` const ("member" / "admin") as a plain String column (not a
//   native Prisma enum — avoids friction on BA CLI regen). `input: false` keeps
//   role out of user-settable signup input.

const prisma = new PrismaClient();

// Allow-list for Better Auth's CSRF origin check. In dev the Vite client (5173)
// proxies /api to the server (3000), but the browser still sends
// `Origin: http://localhost:5173`, so the client URL must be trusted. In prod
// the client is served same-origin (Express static), and baseURL is trusted
// implicitly. CLIENT_URL is optional → filtered out when unset.
const trustedOrigins = [process.env.CLIENT_URL].filter(
  (origin): origin is string => Boolean(origin),
);

export const auth = betterAuth({
  // Runtime secrets/URLs come from env — never hardcoded. Better Auth also reads
  // BETTER_AUTH_SECRET / BETTER_AUTH_URL implicitly; set explicitly for clarity.
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },

  // Database sessions. Session cookies are HTTP-only + SameSite=Lax by default,
  // and Secure is auto-enabled when baseURL is https (production). We do not
  // loosen those defaults.
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once per day
  },

  // CLAUDE.md: rate-limit auth routes in production. Better Auth's built-in
  // limiter is on by default in production; stated explicitly for visibility.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
  },

  user: {
    additionalFields: {
      role: {
        type: [Role.MEMBER, Role.ADMIN],
        required: false,
        defaultValue: Role.MEMBER,
        input: false,
      },
      // Day+month only (e.g. "06-15") — NEVER the year (LGPD minimization).
      // User-editable later (Account page), so input stays allowed.
      birthday: {
        type: "string",
        required: false,
        input: true,
      },
      // Dormant seam: everything is PT today; no multi-language UI is built.
      // Set server-side, not user input.
      preferredLanguage: {
        type: "string",
        required: false,
        defaultValue: "pt",
        input: false,
      },
      // LGPD: gates promotional email only (transactional ignores it). No public
      // consent form in P1, so it is set server-side, not user input.
      marketingConsent: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      // UTM capture — persisted at user creation (seed in P1, Stripe webhook in
      // P4). Always server-injected, never from the model/client.
      acquisitionSource: {
        type: "string",
        required: false,
        input: false,
      },
      acquisitionCampaign: {
        type: "string",
        required: false,
        input: false,
      },
      // Soft-delete — requireAuth rejects users whose deletedAt is set.
      // Admin/system only.
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});
