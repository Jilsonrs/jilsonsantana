import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import healthRouter from "./routes/health.js";
import meRouter from "./routes/me.js";
import adminRouter from "./routes/admin.js";
import coursesRouter from "./routes/courses.js";
import modulesRouter from "./routes/modules.js";
import trilhasRouter from "./routes/trilhas.js";
import lessonsRouter from "./routes/lessons.js";

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
// Phase 2 — content routes. Public reads (catalog/course/trilha/lesson;
// PUBLISHED only) + admin writes (gated per-route inside each router).
app.use("/api", coursesRouter);
app.use("/api", modulesRouter);
app.use("/api", trilhasRouter);
app.use("/api", lessonsRouter);

// Serve client static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../public");

// Reads the `preview` cookie straight from the header (one cookie, trivial
// parse) so we avoid adding cookie-parser. Returns true only when it matches
// the configured PREVIEW_TOKEN.
function hasPreviewCookie(req: express.Request): boolean {
  const token = process.env.PREVIEW_TOKEN;
  if (!token) return false;
  const raw = req.headers.cookie;
  if (!raw) return false;
  return raw.split(";").some((part) => {
    const [name, ...rest] = part.trim().split("=");
    return name === "preview" && rest.join("=") === token;
  });
}

if (process.env.NODE_ENV === "production") {
  // ── Coming-soon gate ────────────────────────────────────────────────────
  // Public visitors see a standalone "Em breve" page; the operator bypasses it
  // by visiting /__preview?token=<PREVIEW_TOKEN> once, which sets a long-lived
  // cookie. Toggled at REQUEST time by the COMING_SOON env var, so launch day
  // is just flipping the Railway variable (service restart) — no code change.

  // Operator bypass: validate the token, drop the preview cookie, land on the
  // real app. Registered BEFORE the gate (it has no extension, so the gate
  // below would otherwise intercept it).
  app.get("/__preview", (req, res) => {
    const token = process.env.PREVIEW_TOKEN;
    if (token && req.query.token === token) {
      res.cookie("preview", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
      });
      return res.redirect("/");
    }
    return res.status(404).send("Not found");
  });

  // The gate sits AFTER the /api routers, so the API (incl. /api/health used by
  // the Railway healthcheck) is never blocked.
  app.use((req, res, next) => {
    if (process.env.COMING_SOON !== "true") return next();
    if (hasPreviewCookie(req)) return next();
    // Only intercept page navigations; let static assets (.js/.css/.svg) pass
    // through — coming-soon.html references none of them anyway.
    if (req.method === "GET" && path.extname(req.path) === "") {
      return res.sendFile(path.join(clientDist, "coming-soon.html"));
    }
    return next();
  });

  app.use(express.static(clientDist));
  // SPA fallback — must be after all API routes
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
