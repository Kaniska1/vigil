-- CreateEnum
CREATE TYPE "OrchestrationEventType" AS ENUM ('PLAN_CREATED', 'AGENT_SELECTED', 'ORCHESTRATION_STARTED', 'STEP_STARTED', 'STEP_COMPLETED', 'STEP_FAILED', 'ORCHESTRATION_COMPLETED', 'ORCHESTRATION_FAILED');

-- CreateTable
CREATE TABLE "OrchestrationEvent" (
    "id" TEXT NOT NULL,
    "type" "OrchestrationEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "orchestrationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrchestrationEvent" ADD CONSTRAINT "OrchestrationEvent_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
