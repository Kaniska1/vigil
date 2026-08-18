import { Router } from "express";

import { getAgents } from "../controllers/agent.controller.js";
import { createRun } from "../controllers/run.controller.js";

const router = Router();

router.get("/", getAgents);

router.post("/:slug/runs", createRun);

export default router;