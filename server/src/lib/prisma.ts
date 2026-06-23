import { PrismaClient } from "@prisma/client";

// Single shared Prisma client for the app's route handlers (Phase 2 on). Prisma
// is the SOLE accessor to Supabase (CLAUDE.md). The globalThis cache keeps tsx
// `dev` hot-reloads from opening a new connection pool on every file change.
//
// Note: lib/auth.ts and seed.ts still construct their own PrismaClient (Better
// Auth adapter / standalone seed). Consolidating them onto this singleton is a
// deliberate future cleanup — left out of this block to avoid touching auth.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
