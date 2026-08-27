import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  jwtVerify,
} from "jose";

import {
  authenticateApiKey,
} from "../services/api-key.service.js";

const secret =
  process.env.VIGIL_API_SECRET;

if (!secret) {
  throw new Error(
    "VIGIL_API_SECRET is not configured"
  );
}

const key =
  new TextEncoder().encode(
    secret
  );

export type AuthenticatedRequest =
  Request & {
    userId?: string;

    authType?:
      | "SESSION"
      | "API_KEY";

    apiKeyId?: string;
  };

async function authenticateSessionToken(
  token: string
) {
  const {
    payload,
  } =
    await jwtVerify(
      token,
      key
    );

  if (
    typeof payload.userId !==
      "string"
  ) {
    return null;
  }

  return {
    userId:
      payload.userId,
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return res
      .status(401)
      .json({
        success: false,
        message:
          "Unauthorized",
      });
  }

  const token =
    authorization
      .slice(7)
      .trim();

  try {
    /*
     * SDK/API keys are intentionally
     * distinguishable from session JWTs.
     */
    if (
      token.startsWith(
        "vigil_"
      )
    ) {
      const apiKeyAuth =
        await authenticateApiKey(
          token
        );

      if (!apiKeyAuth) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Invalid or revoked API key",
          });
      }

      req.userId =
        apiKeyAuth.userId;

      req.apiKeyId =
        apiKeyAuth.apiKeyId;

      req.authType =
        "API_KEY";

      return next();
    }

    const session =
      await authenticateSessionToken(
        token
      );

    if (!session) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Invalid token",
        });
    }

    req.userId =
      session.userId;

    req.authType =
      "SESSION";

    return next();
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        message:
          "Invalid or expired token",
      });
  }
}

/*
 * API-key management should require the
 * signed-in dashboard/session flow.
 *
 * A leaked API key must not be able to
 * create or revoke other API keys.
 */
export async function requireSessionAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  await requireAuth(
    req,
    res,
    () => {
      if (
        req.authType !==
        "SESSION"
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Session authentication required",
          });
      }

      next();
    }
  );
}
