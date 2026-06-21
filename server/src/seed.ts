import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { Role } from "@jilson/core";

// Seed: creates the admin (and an optional test member) for Phase 1.
//
// Why a LOCAL Better Auth instance: the production instance keeps
// `disableSignUp: true` and we don't use the admin plugin, so there is no public
// or server API to create a user through the running app. We mirror the prod
// config here but with sign-up ENABLED (and autoSignIn OFF) purely for seeding.
// Better Auth — not raw Prisma — writes `user` + `account`, so the password is
// hashed with the SAME default scrypt verifier the runtime uses (hand-inserting
// a hash risks a mismatch where the row exists but the admin can't sign in).
// Role is then promoted to admin via Prisma (the column defaults to "member").

const prisma = new PrismaClient();

const seedAuth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false, // seed-only override; prod stays true
    autoSignIn: false,
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: Role;
};

// Idempotent: keyed by email. Re-running never duplicates; it reconciles role.
async function ensureUser({ email, password, name, role }: SeedUser): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role) {
      await prisma.user.update({ where: { email }, data: { role } });
      console.log(`~ ${email} already existed — role reconciled to "${role}"`);
    } else {
      console.log(`= ${email} already exists (role="${role}") — skipped`);
    }
    return;
  }

  // Better Auth creates user + account (correct password hash).
  await seedAuth.api.signUpEmail({ body: { email, password, name } });
  // Promote role (sign-up always lands on the "member" default).
  await prisma.user.update({ where: { email }, data: { role } });
  console.log(`+ created ${email} (role="${role}")`);
}

async function main(): Promise<void> {
  await ensureUser({
    email: requireEnv("SEED_ADMIN_EMAIL"),
    password: requireEnv("SEED_ADMIN_PASSWORD"),
    name: "Jilson Santana",
    role: Role.ADMIN,
  });

  // Optional test member — only if its env vars are present.
  const memberEmail = process.env.SEED_MEMBER_EMAIL;
  const memberPassword = process.env.SEED_MEMBER_PASSWORD;
  if (memberEmail && memberPassword) {
    await ensureUser({
      email: memberEmail,
      password: memberPassword,
      name: "Test Member",
      role: Role.MEMBER,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
