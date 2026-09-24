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
import searchRouter from "./routes/search.js";
import homeRouter from "./routes/home.js";
import adminSiteTextRouter from "./routes/admin-site-text.js";
import siteTextRouter from "./routes/site-text.js";
import adminTestimonialsRouter from "./routes/admin-testimonials.js";
import adminFaqRouter from "./routes/admin-faq.js";

// Monta o app e EXPORTA sem escutar porta. O `listen()` vive em `index.ts`.
//
// POR QUE A SEPARAÇÃO: supertest precisa importar o app para injetar requests
// nele. Enquanto `index.ts` chamava `app.listen()` no topo do módulo, qualquer
// import subia um servidor de verdade — o que torna teste de servidor
// impossível de escrever sem efeito colateral. A entrada de produção continua
// sendo `dist/index.js`; Dockerfile e Railway não mudam.
//
// A checagem de BETTER_AUTH_SECRET em produção NÃO vem para cá de propósito:
// ela chama `process.exit(1)`, e um import em contexto de teste derrubaria o
// runner. Ela é guarda de STARTUP, então mora em `index.ts`.

const app = express();

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
app.use("/api", searchRouter);
app.use("/api", siteTextRouter);
app.use("/api", adminSiteTextRouter);
app.use("/api", adminTestimonialsRouter);
app.use("/api", adminFaqRouter);

// ── Home pública (SSR, sem React) ───────────────────────────────────────────
// Registrada em TODOS os ambientes (em dev o operador abre localhost:3000).
// Em produção ela fica DEPOIS do portão "Em breve", que é aplicado abaixo —
// por isso o portão precisa continuar antes do express.static e do fallback.
const registrarHome = () => app.use("/", homeRouter);

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

  registrarHome();

  app.use(express.static(clientDist));
  // SPA fallback — must be after all API routes
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

if (process.env.NODE_ENV !== "production") {
  // Em desenvolvimento não há portão nem SPA servido pelo Express: a home
  // pública responde direto em http://localhost:3000/. Os estáticos dela
  // (CSS e imagens) vêm de client/public — em produção o build do Vite já
  // copia essa pasta para dentro de server/public.
  registrarHome();
  app.use(express.static(path.join(__dirname, "../../client/public")));

  // Conveniência de desenvolvimento: as páginas públicas são servidas aqui
  // (3000), mas tudo que é do app React vive no Vite (5173). Sem isto, clicar
  // em "Entrar" na home daria 404. Em produção nada disso existe — lá o mesmo
  // Express entrega o React compilado.
  const VITE = process.env.VITE_DEV_URL || "http://localhost:5173";
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (path.extname(req.path) !== "") return next(); // arquivo estático
    return res.redirect(302, VITE + req.originalUrl);
  });
}

export default app;
