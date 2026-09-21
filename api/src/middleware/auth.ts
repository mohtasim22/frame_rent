import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import type { Role } from "@shared/types/domain";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Reads the session cookie and attaches `req.user` when there is one.
 *
 * Deliberately never rejects: plenty of endpoints are public but behave
 * differently when they know who is asking. Rejecting is `requireUser`'s job.
 */
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (session) {
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as Role,
    };
  }

  next();
}

export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError("Sign in to continue");
  }

  next();
}

/**
 * Hiding the admin links in React is a courtesy to the user interface.
 * THIS is the control — every admin endpoint sits behind it.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError("Sign in to continue");
  }

  if (req.user.role !== "ADMIN") {
    throw new ForbiddenError("Admins only");
  }

  next();
}
