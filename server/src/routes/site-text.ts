import { Router } from "express";
import { getDict } from "../lib/dict.js";

const router = Router();

// Leitura PÚBLICA dos textos `common.*` (menu e rodapé), já com as edições do
// operador. É por aqui que o rodapé do app logado mostra os MESMOS textos do
// rodapé da home: editou uma vez em Admin → Textos, muda nos dois lugares
// (decisão do operador, 24/09/2026).
//
// Sai do `getDict()` — a mesma porta da home, com o mesmo cache —, nunca do
// dicionário importado direto, senão a edição do operador não chegaria aqui.
// Só `common`: os textos de cada página (`home.*`) não têm por que sair por API.
router.get("/site-text/common", async (_req, res) => {
  res.json((await getDict()).common);
});

// O ENDEREÇO ANTIGO, com o idioma no fim. A versão do site que está no ar ainda
// o pede (`/site-text/common/pt`); fica até a publicação seguinte (regra da API
// aditiva, CLAUDE.md → Rendering Boundary) e sai no passo 4 da etapa 4.6c. O
// idioma pedido não é lido: a escola é só em português.
router.get("/site-text/common/:lang", async (_req, res) => {
  res.json((await getDict()).common);
});

export default router;
