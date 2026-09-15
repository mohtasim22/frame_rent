import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ApiFailure } from "@shared/types/api";
import { AppError } from "../lib/errors";
import { env } from "../config/env";

// Express identifies error middleware by its FOUR parameters. Do not remove _next.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const body: ApiFailure = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiFailure = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues
          .map((i) => `${i.path.join(".") || "value"}: ${i.message}`)
          .join("; "),
      },
    };
    res.status(400).json(body);
    return;
  }

  // Anything unrecognised is a bug. Log it in full; tell the client nothing useful.
  console.error("Unhandled error:", err);

  const body: ApiFailure = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "Something went wrong."
          : err instanceof Error
            ? err.message
            : String(err),
    },
  };

  res.status(500).json(body);
}
