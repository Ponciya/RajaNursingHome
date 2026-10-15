import { Router } from "express";
import { pingDatabase } from "../config/db.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "raja-nursing-home-billing-api",
    hospital: "Raja Nursing Home",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/health/db", async (_req, res) => {
  const result = await pingDatabase();
  res.status(result.ok ? 200 : 503).json({
    status: result.ok ? "ok" : "error",
    database: result.message,
    timestamp: new Date().toISOString(),
  });
});
