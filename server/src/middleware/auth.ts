import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { Role } from "@jilson/core";
import { auth } from "../lib/auth.js";
import { temAcessoAtivo } from "../lib/acesso.js";

// Types inferred from the Better Auth instance — includes the custom `role`
// additionalField on the user. No `any`, no hand-written user shape.
type AuthSession = typeof auth.$Infer.Session;
type AuthUser = AuthSession["user"];
type SessionData = AuthSession["session"];

// Declaration merging: make req.user / req.session typed everywhere downstream.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: SessionData;
    }
  }
}

// Reads the Better Auth session from the Express request headers (cookie-based).
// Soft-deleted users are treated as unauthenticated even if their cookie is
// still technically valid (CLAUDE.md: requireAuth rejects soft-deleted users).
// Centralizing it here makes both requireAuth and requireAdmin reject them.
export async function loadSession(req: Request) {
  const result = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (result?.user.deletedAt) {
    return null;
  }
  return result;
}

// requireAuth — 401 if no valid session; otherwise attaches req.user/req.session.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = await loadSession(req);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = result.user;
  req.session = result.session;
  next();
}

// requireAdmin — the auth check first (401 without a session), then the role
// check (403 for non-admins). Role compared against the shared `Role` const,
// never a string literal. Standalone + reusable: routes use it on its own.
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = await loadSession(req);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (result.user.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.user = result.user;
  req.session = result.session;
  next();
}

// requireActiveMembership — o invólucro HTTP de `temAcessoAtivo()` (CLAUDE.md → Access
// Architecture; Fase 4, etapa 4.4). Para a rota que exige login E assinatura, SEM EXCEÇÃO:
// 401 sem sessão, 403 `AssinaturaNecessaria` sem acesso. Sozinho, como o `requireAdmin`.
// A regra não mora aqui: quem decide é `temAcessoAtivo()`, a fonte única — este middleware só
// traduz a resposta dela em HTTP. NÃO serve à página da aula, que aceita visitante por causa da
// prévia grátis e pergunta ao gate direto. O admin não passa por aqui: ele tem as rotas dele.
export async function requireActiveMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = await loadSession(req);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!(await temAcessoAtivo(result.user.id))) {
    res.status(403).json({ error: "AssinaturaNecessaria" });
    return;
  }
  req.user = result.user;
  req.session = result.session;
  next();
}
