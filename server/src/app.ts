import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import authRoutes from "./routes/auth.routes";
import assetRoutes from "./routes/assets.routes";

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "bess-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Resource not found" });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: "Internal server error", details: error.message });
});
