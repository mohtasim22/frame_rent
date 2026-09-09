import express from "express";

export const app = express();

// Parses incoming JSON request bodies into req.body.
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
