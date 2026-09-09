import express from "express";
import cors from "cors";

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
  res.json({
    success: true,
    data: {
      status: "ok",
      uptime: Math.round(process.uptime()),
    },
  });
});
