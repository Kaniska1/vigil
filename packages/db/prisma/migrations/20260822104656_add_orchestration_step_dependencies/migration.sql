-- AlterTable
ALTER TABLE "OrchestrationStep" ADD COLUMN     "dependsOnPositions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "input" JSONB;
