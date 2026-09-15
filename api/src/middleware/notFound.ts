import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "../lib/errors";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
}
