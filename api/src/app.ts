import express from "express";
import cors from "cors";
import type { Health } from "@shared/schemas/health.schema";
import type { ApiSuccess } from "@shared/types/api";
import { prisma } from "./lib/prisma";
import { env } from "./config/env";
import { apiRoutes } from "./routes";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/error";


export const app = express();

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })
);

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

app.use("/api/v1", apiRoutes);
app.use(notFound);
app.use(errorHandler);