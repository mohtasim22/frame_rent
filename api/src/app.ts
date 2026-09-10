import express from "express";
import cors from "cors";
import type { Health } from "@shared/schemas/health.schema";
import type { ApiSuccess } from "@shared/types/api";
import { prisma } from "./lib/prisma";


// B4 will move this into a zod-validated env config.
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

export const app = express();

app.use(
  cors({
    origin: WEB_ORIGIN,
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

// TODO(C1): move into modules/brand/ as routes → controller → service
app.get("/api/v1/brands", async (_req, res) => {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, data: brands });
});