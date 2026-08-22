import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import agentRoutes from "./routes/agent.routes.js";
import runRoutes from "./routes/run.routes.js";
import orchestratorRoutes from "./routes/orchestrator.routes.js";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 4000;

app.use(
  cors({
    origin:
      "http://localhost:3000",
  })
);

app.use(
  express.json()
);

app.get(
  "/health",
  (_req, res) => {
    res.json({
      success: true,
      service: "vigil-api",
      status: "healthy",
    });
  }
);

app.use(
  "/api/v1/agents",
  agentRoutes
);

app.use(
  "/api/v1/runs",
  runRoutes
);

app.use(
  "/api/v1/orchestrator",
  orchestratorRoutes
);

app.listen(
  PORT,
  () => {
    console.log(
      `Vigil API running on http://localhost:${PORT}`
    );
  }
);