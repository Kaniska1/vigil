-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('PLANNING', 'BLOCKED', 'READY', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrchestrationStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "OrchestrationRun" (
    "id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "OrchestrationStatus" NOT NULL DEFAULT 'PLANNING',
    "summary" TEXT,
    "plan" JSONB,
    "context" JSONB,
    "unresolvedCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrchestrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationStep" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "agentId" TEXT,
    "runId" TEXT,
    "position" INTEGER NOT NULL,
    "status" "OrchestrationStepStatus" NOT NULL DEFAULT 'PENDING',
    "satisfies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "optionalCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OrchestrationStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrchestrationStep_runId_key" ON "OrchestrationStep"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "OrchestrationStep_orchestrationId_position_key" ON "OrchestrationStep"("orchestrationId", "position");

-- AddForeignKey
ALTER TABLE "OrchestrationRun" ADD CONSTRAINT "OrchestrationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationStep" ADD CONSTRAINT "OrchestrationStep_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationStep" ADD CONSTRAINT "OrchestrationStep_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationStep" ADD CONSTRAINT "OrchestrationStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
