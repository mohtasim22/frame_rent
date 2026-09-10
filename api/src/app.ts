import express from "express";
import cors from "cors";
import type { Health } from "@shared/schemas/health.schema";
import type { ApiSuccess } from "@shared/types/api";


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
