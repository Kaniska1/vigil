import {
  Router,
} from "express";

import {
  getOrchestration,
  listOrchestrations,
  planGoal,
  startOrchestration,
} from "../controllers/orchestrator.controller.js";

import {
  streamOrchestration,
} from "../controllers/orchestration-stream.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  Router();

router.use(
  requireAuth
);

router.post(
  "/plan",
  planGoal
);

router.get(
  "/",
  listOrchestrations
);

router.post(
  "/:orchestrationId/execute",
  startOrchestration
);

router.get(
  "/:orchestrationId/stream",
  streamOrchestration
);

router.get(
  "/:orchestrationId",
  getOrchestration
);

export default router;