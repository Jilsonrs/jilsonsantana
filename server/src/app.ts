import { pedeArquivo } from "./lib/pede-arquivo.js";
import { lerVersaoDoApp } from "./lib/versao-do-app.js";
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
import assinarRouter from "./routes/assinar.js";
import linksDoEmailRouter from "./routes/links-do-email.js";
import adminSiteTextRouter from "./routes/admin-site-text.js";
import siteTextRouter from "./routes/site-text.js";
import adminTestimonialsRouter from "./routes/admin-testimonials.js";
import adminFaqRouter from "./routes/admin-faq.js";
import adminAnnouncementsRouter from "./routes/admin-announcements.js";
import adminMediaRouter from "./routes/admin-media.js";
import adminCourseStructureRouter from "./routes/admin-course-structure.js";
import adminLessonVideoRouter from "./routes/admin-lesson-video.js";
import adminLessonFilesRouter from "./routes/admin-lesson-files.js";
import lessonViewRouter from "./routes/lesson-view.js";
import progressRouter from "./routes/progress.js";
import savedRouter from "./routes/saved.js";
import notificacoesRouter from "./routes/notificacoes.js";
import adminCaptionsRouter from "./routes/admin-captions.js";
import adminStatsRouter from "./routes/admin-stats.js";
import stripeWebhookRouter from "./routes/stripe-webhook.js";
import billingSemLoginRouter from "./routes/billing-sem-login.js";
import contaCodigoRouter from "./routes/conta-codigo.js";
import billingRouter from "./routes/billing.js";
import adminAssinaturasRouter from "./routes/admin-assinaturas.js";
import adminCobrancaRouter from "./routes/admin-cobranca.js";
import { cabecalhosDeSeguranca } from "./lib/cabecalhos-de-seguranca.js";
import { tratarErroDaApi } from "./lib/erro-da-api.js";
import { anotarErroDoSite } from "./lib/erro-do-site.js";

// Monta o app e EXPORTA sem escutar porta. O `listen()` vive em `index.ts`.
//
// POR QUE A SEPARAÇÃO: supertest precisa importar o app para injetar requests
// nele. Enquanto `index.ts` chamava `app.listen()` no topo do módulo, qualquer
// import subia um servidor de verdade — o que torna teste de servidor
// impossível de escrever sem efeito colateral. A entrada de produção continua
// sendo `dist/index.js`; Dockerfile e deploy não mudam.
//
// A checagem de BETTER_AUTH_SECRET em produção NÃO vem para cá de propósito:
// ela chama `process.exit(1)`, e um import em contexto de teste derrubaria o
// runner. Ela é guarda de STARTUP, então mora em `index.ts`.

const app = express();

// O DOMÍNIO SEM "WWW" LEVA AO "WWW" COM O RESTO DO ENDEREÇO (Bloco G, etapa G2 — fecha a P57 na G4):
// no mapeamento de domínio do Cloud Run, `jilsonsantana.com` aponta para este mesmo serviço por
// registros A e AAAA (sem o encaminhamento da GoDaddy). Só desvia quando o `Host` é `jilsonsantana.com`
// exato: o endereço provisório do Google (`*.run.app`) e o `localhost` não desviam.
app.use((req, res, next) => {
  if (req.hostname.toLowerCase() === "jilsonsantana.com") {
    const resto = req.originalUrl.startsWith("/") ? req.originalUrl : "/";
    res.redirect(301, `https://www.jilsonsantana.com${resto}`);
    return;
  }
  next();
});

// Better Auth HTTP handler — MUST be mounted BEFORE express.json(). If JSON
// parsing runs first it consumes the request body and breaks auth (known
// pitfall). toNodeHandler returns a promise; Express 5 does NOT auto-catch
// rejections from adapter-style handlers, so we chain .catch(next) (this was
// the Phase 0 boot bug). Path uses the Express 5 named-wildcard syntax.
const authHandler = toNodeHandler(auth);
app.all("/api/auth/{*any}", (req, res, next) => authHandler(req, res).catch(next));

// O AVISO DA STRIPE (webhook — Fase 4, etapa 4.1) — TAMBÉM ANTES do express.json(): a
// verificação da assinatura precisa do corpo CRU (CLAUDE.md → Membership Gating, a trava de
// montagem). A rota lê o próprio corpo com `express.raw`.
app.use("/api", stripeWebhookRouter);

// JSON body parsing for the REST of the API — AFTER the auth handler.
app.use(express.json());

// OS CABEÇALHOS DE SEGURANÇA, em toda resposta (`lib/cabecalhos-de-seguranca.ts`): a janela da
// escola isolada de quem a abre (Bloco AULA, etapa 6), a escola que não se deixa emoldurar e o
// "só https" em produção (E10 da revisão ampla da cobrança, 29/10/2026).
const CABECALHOS_DE_SEGURANCA = cabecalhosDeSeguranca(process.env.NODE_ENV === "production");
app.use((_req, res, next) => {
  res.set(CABECALHOS_DE_SEGURANCA);
  next();
});

// A VERSÃO do app que este servidor entrega, em toda resposta da API (decisão do
// operador, 06/10/2026): uma aba aberta antes de uma publicação percebe a
// diferença e carrega a página inteira na próxima troca de tela, já atualizada
// (`client/src/lib/versao.ts`). Só em produção: em desenvolvimento não há app
// montado ao lado, e o Vite serve outro.
const versaoDoApp =
  process.env.NODE_ENV === "production" ? lerVersaoDoApp(path.join(path.dirname(fileURLToPath(import.meta.url)), "../public")) : null;
if (versaoDoApp) {
  app.use("/api", (_req, res, next) => {
    res.set("X-Versao-Do-App", versaoDoApp);
    next();
  });
}

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
app.use("/api", adminAnnouncementsRouter);
// Envio de arquivo pelo admin (capa de curso → Bunny Storage). O corpo cru é
// lido só dentro da rota, com `express.raw` — o `express.json()` acima ignora
// `image/*`, então não há conflito.
app.use("/api", adminMediaRouter);
app.use("/api", adminCourseStructureRouter);
app.use("/api", adminLessonVideoRouter);
app.use("/api", adminLessonFilesRouter);
app.use("/api", lessonViewRouter);
app.use("/api", progressRouter);
app.use("/api", savedRouter);
// O sino de Notificações (Bloco E, etapa 4 — 04/10/2026).
app.use("/api", notificacoesRouter);
// As legendas: o corpo cru (`.vtt`) é lido só dentro da rota, como a capa.
app.use("/api", adminCaptionsRouter);
// Os números do cartão do curso no admin (Fase 5, Bloco MEDIR, etapa 2 — 09/10/2026):
// estatística, em rota própria (CLAUDE.md → Analytics Convention).
app.use("/api", adminStatsRouter);
// Pedir o código no e-mail (etapa 4.7, passo 5): para entrar sem senha e para criar uma senha nova.
app.use("/api", contaCodigoRouter);
// Assinar SEM login (etapa 4.7, passo 4): fora do ar em produção até o operador ligar (passo 8).
app.use("/api", billingSemLoginRouter);
// Assinar com a conta logada (Fase 4, etapa 4.2): depois do `express.json()` — só o AVISO da
// Stripe, lá em cima, precisa do corpo cru.
app.use("/api", billingRouter);
// O admin força a sincronia de uma conta com a Stripe (etapa 4.4) — só admin, nunca rota aberta.
app.use("/api", adminAssinaturasRouter);
app.use("/api", adminCobrancaRouter);

// O TRATADOR DE ERRO DA API — o ÚLTIMO de `/api`, depois de todas as rotas (etapa 4.4): o erro
// que escapar de qualquer uma delas (inclusive do login e do aviso da Stripe, montados lá em
// cima) responde 500 `ErroInterno`, sem copiar status nem cabeçalho do erro. Rota nova de
// `/api` entra ACIMA desta linha.
app.use("/api", tratarErroDaApi);

// ── Os links dos e-mails (etapa 4.7, passo 9) ───────────────────────────────
// "Quero receber novidades" e "Descadastrar": as páginas do servidor que o link de um e-mail abre. Montadas ANTES do
// portão "Em breve" (abaixo, só em produção): o link de um e-mail tem de funcionar sempre — o de descadastrar, por lei.
// Só abrem com o código assinado pelo servidor (`lib/links-do-email.ts`).
app.use("/", linksDoEmailRouter);

// ── Home pública (SSR, sem React) ───────────────────────────────────────────
// Registrada em TODOS os ambientes (em dev o operador abre localhost:3000).
// Em produção ela fica DEPOIS do portão "Em breve", que é aplicado abaixo —
// por isso o portão precisa continuar antes do express.static e do fallback.
// A tela pública de assinar (`/assinar`, etapa 4.7, passo 6c) entra junto: também é página do
// servidor, e também fica atrás do portão.
const registrarHome = () => {
  app.use("/", homeRouter);
  app.use("/", assinarRouter);
};

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
  // is just flipping the variable (service restart) — no code change.

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
  // the healthcheck) is never blocked.
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

  // A página do app (HTML) NUNCA fica guardada no navegador (`no-cache`, a
  // recomendação da doc do Vite): senão, mesmo recarregando, o navegador podia
  // reabrir a versão anterior, que aponta para arquivos que não existem mais.
  app.use(
    express.static(clientDist, {
      setHeaders: (res, arquivo) => {
        if (arquivo.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  // SPA fallback — must be after all API routes. Só para TELA: um arquivo que
  // não existe (o pedaço do app de uma versão anterior) responde 404, nunca a
  // página do app no lugar — senão a tela fica em branco (05/10/2026).
  app.get("/*splat", (req, res) => {
    if (pedeArquivo(req.path)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"), { headers: { "Cache-Control": "no-cache" } });
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

// O ÚLTIMO de tudo: o erro que escapar FORA de `/api` (a home, uma página pública) é anotado com
// etiqueta — é o que o faz virar alerta — e segue para a resposta de sempre do Express.
app.use(anotarErroDoSite);

export default app;
