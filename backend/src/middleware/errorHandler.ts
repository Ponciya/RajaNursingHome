import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";
import { env } from "../config/env.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof HttpError
      ? err.message
      : env.nodeEnv === "development" && err instanceof Error
        ? err.message
        : "Internal server error";

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
