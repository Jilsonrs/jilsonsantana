import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { Role } from "@jilson/core";

// Phase 1 — Bloco 1: minimal Better Auth config, JUST enough for the CLI to
// generate the Prisma schema (user/session/account/verification). The HTTP
// handler is NOT mounted on Express yet (that is a later block).
//
// Conventions (see CLAUDE.md):
// - Prisma adapter on Supabase Postgres; Prisma is the sole DB accessor.
// - Email/password with database sessions (Better Auth default storage).
// - Public sign-up is gated: `disableSignUp: true`. Users are created by a
//   trusted trigger (seed in P1, Stripe webhook in P4), never self-registration.
// - `role` is a custom additionalField. We store the lowercase values from the
//   shared `Role` const ("member" / "admin"), NOT a native Prisma enum — see
//   the report / decision note for why this avoids enum<->additionalField
//   friction. `input: false` keeps role out of user-settable signup input.

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: [Role.MEMBER, Role.ADMIN],
        required: false,
        defaultValue: Role.MEMBER,
        input: false,
      },
    },
  },
});
