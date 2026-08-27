import {
  Router,
} from "express";

import {
  getAgents,
} from "../controllers/agent.controller.js";

import {
  getMyPublishedAgents,
  publishAgent,
} from "../controllers/agent-publishing.controller.js";

import {
  getPublishedAgent,
  patchPublishedAgent,
} from "../controllers/agent-management.controller.js";

import {
  createRun,
} from "../controllers/run.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  Router();

router.get(
  "/",
  getAgents
);

router.get(
  "/mine",
  requireAuth,
  getMyPublishedAgents
);

router.post(
  "/publish",
  requireAuth,
  publishAgent
);

router.get(
  "/published/:agentId",
  requireAuth,
  getPublishedAgent
);

router.patch(
  "/published/:agentId",
  requireAuth,
  patchPublishedAgent
);

router.post(
  "/:slug/runs",
  requireAuth,
  createRun
);

export default router;
