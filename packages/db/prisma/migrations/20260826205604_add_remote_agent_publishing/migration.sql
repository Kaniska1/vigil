-- CreateEnum
CREATE TYPE "AgentSource" AS ENUM ('FIRST_PARTY', 'REMOTE');

-- CreateEnum
CREATE TYPE "AgentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "endpointUrl" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "source" "AgentSource" NOT NULL DEFAULT 'FIRST_PARTY',
ADD COLUMN     "visibility" "AgentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
