import { Router } from "express";
import { ROTAS_PUBLICAS, TELA_DE_ASSINAR, TELA_DE_CONCLUIDO, TELA_DE_CONCLUIDO_SEM_LOGIN } from "@jilson/core";
import type { Request, Response } from "express";
import { getDict } from "../lib/dict.js";
import { etiquetasDaPagina } from "../lib/etiquetas-do-app.js";
import { loadSession } from "../middleware/auth.js";
import { renderAssinar } from "../views/assinar.js";
import { assinaturaSemLoginNoAr } from "./billing-sem-login.js";

// A TELA PÚBLICA DE ASSINAR, `/assinar` (etapa 4.7, passo 6c). Página do servidor com o app no meio
// (`views/assinar.ts`). Quem a vê é só o VISITANTE:
//   - quem está LOGADO vai para a tela de assinar do app, que já funciona (decisão do operador,
//     21/10/2026: o e-mail que já tem conta entra para assinar);
//   - com a venda sem login DESLIGADA (produção, até o operador ligar `ASSINAR_SEM_LOGIN` no passo
//     8), nada muda para o visitante: vai para a tela de entrar, como antes desta página existir;
//   - em DEV, a página só funciona aberta pelo Vite (os scripts do app moram lá): o proxy dele põe
//     o cabeçalho abaixo (`client/vite.config.ts`); aberta direto no Express, vai para o Vite.

const router = Router();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/** O cabeçalho que o proxy do Vite põe nas páginas do servidor (`client/vite.config.ts`). */
export const CABECALHO_DO_VITE = "x-pagina-pelo-vite";

/** As duas páginas: a de assinar e a de depois do pagamento (passo 6e2). Logado, cada uma tem a sua no app. */
const PAGINAS = {
  assinar: { endereco: ROTAS_PUBLICAS.assinar, doApp: TELA_DE_ASSINAR },
  concluido: { endereco: TELA_DE_CONCLUIDO_SEM_LOGIN, doApp: TELA_DE_CONCLUIDO },
} as const;

async function responder(pagina: keyof typeof PAGINAS, req: Request, res: Response): Promise<void> {
  if (await loadSession(req)) {
    res.redirect(302, PAGINAS[pagina].doApp);
    return;
  }
  if (!assinaturaSemLoginNoAr()) {
    res.redirect(302, "/login");
    return;
  }
  if (process.env.NODE_ENV !== "production" && req.get(CABECALHO_DO_VITE) !== "1") {
    res.redirect(302, (process.env.VITE_DEV_URL || "http://localhost:5173") + req.originalUrl);
    return;
  }
  const [dict, etiquetasDoApp] = await Promise.all([getDict(), etiquetasDaPagina()]);
  // Os arquivos do app mudam de nome a cada versão: a página nunca fica guardada (como o `index.html`).
  res.set("Cache-Control", "no-cache");
  res.send(renderAssinar({ dict, baseUrl: BASE_URL, etiquetasDoApp, pagina }));
}

router.get(PAGINAS.assinar.endereco, (req, res) => responder("assinar", req, res));
router.get(PAGINAS.concluido.endereco, (req, res) => responder("concluido", req, res));

export default router;
