-- AlterTable
ALTER TABLE "OrchestrationRun" ADD COLUMN     "state" JSONB,
ADD COLUMN     "stateVersion" INTEGER NOT NULL DEFAULT 0;
