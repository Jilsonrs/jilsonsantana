-- Phase 1 / Bloco 4 — complete the User identity (lean, extras optional).
-- Additive columns on the existing `user` table (already RLS-enabled in the
-- better_auth_init migration → no new RLS needed). Defaults backfill the
-- existing seeded rows; nullable columns stay NULL.
--   birthday            day+month only, e.g. "06-15" (LGPD — never the year)
--   preferredLanguage   dormant seam, default "pt" (no multi-language UI yet)
--   marketingConsent    LGPD, default false (gates promotional email only)
--   acquisitionSource   UTM capture (set server-side at user creation)
--   acquisitionCampaign UTM capture
--   deletedAt           soft-delete (requireAuth rejects users with it set)

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "acquisitionCampaign" TEXT,
ADD COLUMN     "acquisitionSource" TEXT,
ADD COLUMN     "birthday" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsent" BOOLEAN DEFAULT false,
ADD COLUMN     "preferredLanguage" TEXT DEFAULT 'pt';
