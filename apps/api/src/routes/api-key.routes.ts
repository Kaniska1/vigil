import { Router } from "express";
import {
  deleteApiKey,
  getApiKeySecret,
  getApiKeys,
  postApiKey,
} from "../controllers/api-key.controller.js";
import { requireSessionAuth } from "../middleware/auth.middleware.js";

const router = Router();
router.use(requireSessionAuth);
router.get("/", getApiKeys);
router.post("/", postApiKey);
router.get("/:apiKeyId/reveal", getApiKeySecret);
router.delete("/:apiKeyId", deleteApiKey);
export default router;