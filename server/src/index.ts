import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthRouter from "./routes/health.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// API routes
app.use("/api", healthRouter);

// Serve client static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../public");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  // SPA fallback — must be after all API routes
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
