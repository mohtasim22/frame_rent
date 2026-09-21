import express from "express";
import cors from "cors";
import type { Health } from "@shared/schemas/health.schema";
import type { ApiSuccess } from "@shared/types/api";
import { env } from "./config/env";
import { apiRoutes } from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { attachUser } from "./middleware/auth";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/error";


export const app = express();

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })
);

// Mounted BEFORE express.json(). better-auth reads the raw request stream
// itself; a body parser that has already drained it leaves nothing to read.
// `*splat` is Express 5 syntax — a bare `*` no longer parses.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  const body: ApiSuccess<Health> ={
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
    },
  }
  res.json(body);
});

app.use(attachUser);
app.use("/api/v1", apiRoutes);
app.use(notFound);
app.use(errorHandler);