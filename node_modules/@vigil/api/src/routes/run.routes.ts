import { Router } from "express";

import {
  getRun,
  listRuns,
} from "../controllers/run.controller.js";

import {
  streamRun,
} from "../controllers/run-stream.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  Router();

router.use(
  requireAuth
);

router.get(
  "/",
  listRuns
);

router.get(
  "/:runId/stream",
  streamRun
);

router.get(
  "/:runId",
  getRun
);

export default router;