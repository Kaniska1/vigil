import {
  Router,
} from "express";

import {
  getMetrics,
} from "../controllers/metrics.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  Router();

router.get(
  "/",
  requireAuth,
  getMetrics
);

export default router;