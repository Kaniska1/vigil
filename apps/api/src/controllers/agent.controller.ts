import type {
  Request,
  Response,
} from "express";

import {
  discoverAgents,
} from "../services/agent-registry.service.js";

export const getAgents =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const capability =
        typeof req.query
          .capability ===
        "string"
          ? req.query
              .capability
          : undefined;

      const tool =
        typeof req.query
          .tool ===
        "string"
          ? req.query.tool
          : undefined;

      const permission =
        typeof req.query
          .permission ===
        "string"
          ? req.query
              .permission
          : undefined;

      const category =
        typeof req.query
          .category ===
        "string"
          ? req.query
              .category
          : undefined;

      const search =
        typeof req.query.q ===
        "string"
          ? req.query.q
          : undefined;

      const agents =
        await discoverAgents({
          capability,
          tool,
          permission,
          category,
          search,
        });

      return res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error(
        "Failed to fetch agents:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to fetch agents",
        });
    }
  };