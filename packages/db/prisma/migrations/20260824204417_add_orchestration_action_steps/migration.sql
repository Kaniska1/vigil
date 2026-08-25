-- CreateEnum
CREATE TYPE "OrchestrationStepKind" AS ENUM ('AGENT', 'ACTION');

-- AlterTable
ALTER TABLE "OrchestrationStep" ADD COLUMN     "actionName" TEXT,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "kind" "OrchestrationStepKind" NOT NULL DEFAULT 'AGENT',
ADD COLUMN     "result" JSONB;
