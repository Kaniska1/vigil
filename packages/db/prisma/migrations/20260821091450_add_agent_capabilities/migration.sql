-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "category" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tools" TEXT[] DEFAULT ARRAY[]::TEXT[];
