import { Router } from "express";

import {
  getAgents,
} from "../controllers/agent.controller.js";

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

router.post(
  "/:slug/runs",
  requireAuth,
  createRun
);

export default router;