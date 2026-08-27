import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import prisma from "../lib/prisma.js";

const API_KEY_PREFIX = "vigil_";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function hashApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getEncryptionKey() {
  const secret = process.env.VIGIL_API_KEY_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("VIGIL_API_KEY_ENCRYPTION_KEY is not configured");
  }

  return createHash("sha256").update(secret).digest();
}

function encryptApiKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: ciphertext.toString("base64"),
    encryptionIv: iv.toString("base64"),
    encryptionTag: authTag.toString("base64"),
  };
}

function decryptApiKey(input: {
  encryptedKey: string;
  encryptionIv: string;
  encryptionTag: string;
}) {
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(input.encryptionIv, "base64")
  );

  decipher.setAuthTag(Buffer.from(input.encryptionTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.encryptedKey, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export async function createApiKey(userId: string, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("API_KEY_NAME_REQUIRED");

  const rawKey = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const encrypted = encryptApiKey(rawKey);

  const record = await prisma.apiKey.create({
    data: {
      userId,
      name: normalizedName,
      prefix: rawKey.slice(0, 14),
      keyHash: hashApiKey(rawKey),
      ...encrypted,
    },
  });

  return {
    apiKey: {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt,
    },
    secret: rawKey,
  };
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revealApiKey(userId: string, apiKeyId: string) {
  const record = await prisma.apiKey.findFirst({
    where: { id: apiKeyId, userId },
    select: {
      encryptedKey: true,
      encryptionIv: true,
      encryptionTag: true,
      revokedAt: true,
    },
  });

  if (!record) throw new Error("API_KEY_NOT_FOUND");
  if (record.revokedAt) throw new Error("API_KEY_REVOKED");
  if (!record.encryptedKey || !record.encryptionIv || !record.encryptionTag) {
    throw new Error("API_KEY_NOT_RECOVERABLE");
  }

  return {
    secret: decryptApiKey({
      encryptedKey: record.encryptedKey,
      encryptionIv: record.encryptionIv,
      encryptionTag: record.encryptionTag,
    }),
  };
}

export async function revokeApiKey(userId: string, apiKeyId: string) {
  const existing = await prisma.apiKey.findFirst({ where: { id: apiKeyId, userId } });
  if (!existing) throw new Error("API_KEY_NOT_FOUND");
  if (existing.revokedAt) return existing;
  return prisma.apiKey.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
}

export async function authenticateApiKey(rawKey: string) {
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!record || record.revokedAt) return null;

  void prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined);

  return { userId: record.userId, apiKeyId: record.id };
}
