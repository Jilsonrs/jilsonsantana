-- CreateEnum
CREATE TYPE "Level" AS ENUM ('INICIANTE', 'INTERMEDIARIO', 'AVANCADO');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Layer" AS ENUM ('UNIVERSAL', 'MODERNO', 'IA');

-- CreateEnum
CREATE TYPE "PlanItemType" AS ENUM ('COURSE', 'LESSON');

-- CreateTable
CREATE TABLE "course" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "level" "Level",
    "learnTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "personas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" JSONB,
    "faq" JSONB,
    "camadas" "Layer"[] DEFAULT ARRAY[]::"Layer"[],
    "camadaOverride" JSONB,
    "thumbnailUrl" TEXT,
    "introVideoId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "layer" "Layer",
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_plan" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "skillsCovered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourcePlanId" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_module" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plan_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_item" (
    "id" SERIAL NOT NULL,
    "planModuleId" INTEGER NOT NULL,
    "itemType" "PlanItemType" NOT NULL,
    "courseId" INTEGER,
    "lessonId" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_slug_key" ON "course"("slug");

-- CreateIndex
CREATE INDEX "module_courseId_idx" ON "module"("courseId");

-- CreateIndex
CREATE INDEX "lesson_moduleId_idx" ON "lesson"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_plan_slug_key" ON "learning_plan"("slug");

-- CreateIndex
CREATE INDEX "learning_plan_ownerUserId_idx" ON "learning_plan"("ownerUserId");

-- CreateIndex
CREATE INDEX "plan_module_planId_idx" ON "plan_module"("planId");

-- CreateIndex
CREATE INDEX "plan_item_planModuleId_idx" ON "plan_item"("planModuleId");

-- CreateIndex
CREATE INDEX "plan_item_courseId_idx" ON "plan_item"("courseId");

-- CreateIndex
CREATE INDEX "plan_item_lessonId_idx" ON "plan_item"("lessonId");

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan" ADD CONSTRAINT "learning_plan_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan" ADD CONSTRAINT "learning_plan_sourcePlanId_fkey" FOREIGN KEY ("sourcePlanId") REFERENCES "learning_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_module" ADD CONSTRAINT "plan_module_planId_fkey" FOREIGN KEY ("planId") REFERENCES "learning_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_planModuleId_fkey" FOREIGN KEY ("planModuleId") REFERENCES "plan_module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint (hand-added — Prisma does not emit CHECKs). Enforces the free-mix
-- XOR: a PlanItem is EITHER a whole course OR a standalone lesson, and itemType
-- always matches exactly the one populated FK.
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_type_xor" CHECK (
    ("itemType" = 'COURSE' AND "courseId" IS NOT NULL AND "lessonId" IS NULL)
    OR
    ("itemType" = 'LESSON' AND "lessonId" IS NOT NULL AND "courseId" IS NULL)
);

-- EnableRowLevelSecurity (RLS convention — see CLAUDE.md; hand-added, Prisma does
-- not emit it). No policies: Prisma connects via a BYPASSRLS role and is the sole
-- accessor; RLS only blocks the Supabase Data API (anon/authenticated).
ALTER TABLE "public"."course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."learning_plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."plan_module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."plan_item" ENABLE ROW LEVEL SECURITY;
