import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ApiFailure } from "@shared/types/api";
import { AppError } from "../lib/errors";
import { Prisma } from "../generated/prisma/client";
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

  /**
   * A unique-constraint violation is the caller's problem, not a server fault.
   * Without this it escapes as a 500, which tells an admin who typed an
   * existing slug precisely nothing.
   */
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const body: ApiFailure = {
      success: false,
      error: {
        code: "DUPLICATE",
        message: `Something already uses that ${duplicateField(err)}.`,
      },
    };
    res.status(409).json(body);
    return;
  }

  // P2025: update or delete against a row that is not there.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2025"
  ) {
    const body: ApiFailure = {
      success: false,
      error: { code: "NOT_FOUND", message: "That record no longer exists." },
    };
    res.status(404).json(body);
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

/**
 * Which field collided, for a P2002.
 *
 * Prisma's classic engine put the columns in `meta.target`. With a driver
 * adapter there is no `target` at all — the database's constraint name is
 * buried under `meta.driverAdapterError` instead. Both shapes are read here,
 * with the error text as a last resort, so the admin is told it was the *slug*
 * rather than "that value".
 */
function duplicateField(err: Prisma.PrismaClientKnownRequestError): string {
  const meta = err.meta as
    | {
        target?: unknown;
        driverAdapterError?: { cause?: { constraint?: { index?: string } } };
      }
    | undefined;

  if (Array.isArray(meta?.target)) return meta.target.join(", ");

  const index =
    meta?.driverAdapterError?.cause?.constraint?.index ??
    err.message.match(/constraint: `([^`]+)`/)?.[1];

  if (!index) return "value";

  // "products_slug_key" -> "slug";  "booking_items_a_b_key" -> "a b"
  const stripped = index.replace(/_key$/, "");
  const parts = stripped.split("_");

  return (parts.length > 1 ? parts.slice(1).join(" ") : stripped) || "value";
}
