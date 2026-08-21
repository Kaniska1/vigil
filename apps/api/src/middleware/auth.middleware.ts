import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  jwtVerify,
} from "jose";

const secret =
  process.env.VIGIL_API_SECRET;

if (!secret) {
  throw new Error(
    "VIGIL_API_SECRET is not configured"
  );
}

const key =
  new TextEncoder().encode(secret);

export type AuthenticatedRequest =
  Request & {
    userId?: string;
  };

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
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const token =
    authorization.slice(7);

  try {
    const { payload } =
      await jwtVerify(
        token,
        key
      );

    if (
      typeof payload.userId !==
      "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.userId =
      payload.userId;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
}
