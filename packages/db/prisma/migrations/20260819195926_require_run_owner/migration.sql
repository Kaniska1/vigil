/*
  Warnings:

  - Made the column `userId` on table `Run` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Run" ALTER COLUMN "userId" SET NOT NULL;
