-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "encryptedKey" TEXT,
ADD COLUMN     "encryptionIv" TEXT,
ADD COLUMN     "encryptionTag" TEXT;
