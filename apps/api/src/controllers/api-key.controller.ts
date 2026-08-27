import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createApiKey,
  listApiKeys,
  revealApiKey,
  revokeApiKey,
} from "../services/api-key.service.js";

export async function getApiKeys(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  return res.json({ success: true, data: await listApiKeys(req.userId) });
}

export async function postApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const name = typeof req.body?.name === "string" ? req.body.name : "";
    return res.status(201).json({ success: true, data: await createApiKey(req.userId, name) });
  } catch (error) {
    if (error instanceof Error && error.message === "API_KEY_NAME_REQUIRED") {
      return res.status(400).json({ success: false, message: "API key name is required" });
    }
    console.error("Failed to create API key:", error);
    return res.status(500).json({ success: false, message: "Failed to create API key" });
  }
}

export async function getApiKeySecret(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await revealApiKey(req.userId, String(req.params.apiKeyId));
    return res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "API_KEY_NOT_FOUND") return res.status(404).json({ success: false, message: "API key not found" });
      if (error.message === "API_KEY_REVOKED") return res.status(409).json({ success: false, message: "Revoked API keys cannot be revealed" });
      if (error.message === "API_KEY_NOT_RECOVERABLE") return res.status(409).json({ success: false, message: "This older key cannot be revealed. Create a new key." });
    }
    console.error("Failed to reveal API key:", error);
    return res.status(500).json({ success: false, message: "Failed to reveal API key" });
  }
}

export async function deleteApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    await revokeApiKey(req.userId, String(req.params.apiKeyId));
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "API_KEY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "API key not found" });
    }
    console.error("Failed to revoke API key:", error);
    return res.status(500).json({ success: false, message: "Failed to revoke API key" });
  }
}
