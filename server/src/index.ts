import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import healthRouter from "./routes/health.js";
import meRouter from "./routes/me.js";
import adminRouter from "./routes/admin.js";

// Fail fast in production if a required secret is missing — a clear startup
// error instead of booting and then crashing on an async Better Auth error
// (which previously surfaced only as a confusing Railway healthcheck failure).
if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  console.error(
    "FATAL: BETTER_AUTH_SECRET must be set in production. Aborting startup.",
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT ?? 3000;

// Better Auth HTTP handler — MUST be mounted BEFORE express.json(). If JSON
// parsing runs first it consumes the request body and breaks auth (known
// pitfall). toNodeHandler returns a promise; Express 5 does NOT auto-catch
// rejections from adapter-style handlers, so we chain .catch(next) (this was
// the Phase 0 boot bug). Path uses the Express 5 named-wildcard syntax.
const authHandler = toNodeHandler(auth);
app.all("/api/auth/{*any}", (req, res, next) => authHandler(req, res).catch(next));

// JSON body parsing for the REST of the API — AFTER the auth handler.
app.use(express.json());

// API routes
app.use("/api", healthRouter);
app.use("/api", meRouter);
app.use("/api", adminRouter);

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
