import { Router, type Request, type RequestHandler, type Response } from "express";
import { getDict } from "../lib/dict.js";
import { descadastrar, registrarLead } from "../lib/leads.js";
import { limiteSemLogin } from "../lib/limite-de-tentativas.js";
import { caminhoDoLink, idDoLink, type TipoDeLink } from "../lib/links-do-email.js";
import { OrigemDoLead, prisma } from "../lib/prisma.js";
import { pedidoDeOutroSite } from "../lib/protecao-da-cobranca.js";
import { renderPaginaDoLink, type PaginaDoLink } from "../views/pagina-do-link.js";

// OS LINKS DOS E-MAILS A QUEM NÃO É ALUNO (etapa 4.7, passo 9 — decisões do operador, 29/10/2026):
//   - `/novidades/<id>/<assinatura>` — o botão "Quero receber novidades" do lembrete de quem não terminou de assinar: o clique
//     cria o lead (do lembrete, com o e-mail PROVADO — o link chegou àquela caixa). Depois dos 7 dias, a ficha não existe
//     mais, e o link não vale;
//   - `/descadastrar/<id>/<assinatura>` — em todo e-mail a um lead: o clique descadastra O E-MAIL (o lead e, se houver conta com
//     ele, a caixa de novidades da conta). Vale enquanto o lead existir.
// ABRIR NÃO FAZ NADA: a página pede o clique num botão, que envia o pedido — os programas de segurança de e-mail abrem os
// links sozinhos, e fariam alguém virar lead, ou se descadastrar, sem ter clicado. O código é uma assinatura do servidor
// (`lib/links-do-email.ts`); o adulterado, o de outro tipo e o vencido dão a mesma página ("não vale"), sem dizer qual.
// O pedido que vem de OUTRO SITE é recusado (a proteção da cobrança), e cada endereço tem um teto de pedidos. Montadas
// ANTES do "Em breve" (`app.ts`): o link de um e-mail tem de funcionar sempre — o de descadastrar, por lei.

const router = Router();

async function responder(res: Response, status: number, pagina: PaginaDoLink): Promise<void> {
  // Cada página é de UMA pessoa (o e-mail aparece nela): nada fica guardado no caminho.
  res.status(status).set("Cache-Control", "private, no-store").set("X-Robots-Tag", "noindex").send(renderPaginaDoLink(await getDict(), pagina));
}

/** O pedido que muda alguma coisa e vem de outro site: recusado, com a página de "não vale" — e nada muda. */
function soDoSite(tipo: TipoDeLink): RequestHandler {
  return (req, res, next) => {
    if (!pedidoDeOutroSite(req)) {
      next();
      return;
    }
    console.warn(`[api] POST /${tipo} recusado: o pedido veio de outro site`);
    responder(res, 403, { tipo, estado: "nao-vale" }).catch(next);
  };
}

/** O código do link, do caminho pedido: o id e a assinatura (`lib/links-do-email.ts`). */
const codigoDe = (req: Request) => (typeof req.params.id === "string" && typeof req.params.assinatura === "string" ? `${req.params.id}/${req.params.assinatura}` : "");

/** A ficha do link "Quero receber novidades" — ou nada (código que não vale, ou a ficha já apagada). */
async function fichaDoLink(req: Request) {
  const id = idDoLink("novidades", codigoDe(req));
  return id ? prisma.guestCheckout.findUnique({ where: { id }, select: { id: true, email: true, nome: true, acquisitionSource: true, acquisitionCampaign: true } }) : null;
}

/** O lead do link "Descadastrar" — ou nada. */
async function leadDoLink(req: Request) {
  const id = idDoLink("descadastrar", codigoDe(req));
  return id ? prisma.lead.findUnique({ where: { id }, select: { id: true, email: true } }) : null;
}

router.get("/novidades/:id/:assinatura", async (req, res) => {
  const ficha = await fichaDoLink(req);
  if (!ficha) return responder(res, 404, { tipo: "novidades", estado: "nao-vale" });
  return responder(res, 200, { tipo: "novidades", estado: "pedir", email: ficha.email, acao: caminhoDoLink("novidades", ficha.id) });
});

router.post("/novidades/:id/:assinatura", soDoSite("novidades"), ...limiteSemLogin.links, async (req, res) => {
  const ficha = await fichaDoLink(req);
  if (!ficha) return responder(res, 404, { tipo: "novidades", estado: "nao-vale" });
  const agora = new Date();
  // O clique veio de um link que a escola mandou àquela caixa: o e-mail fica PROVADO (P96).
  const lead = await registrarLead({
    email: ficha.email,
    nome: ficha.nome,
    origem: OrigemDoLead.LEMBRETE,
    consentimentoEm: agora,
    confirmadoEm: agora,
    acquisitionSource: ficha.acquisitionSource,
    acquisitionCampaign: ficha.acquisitionCampaign,
  });
  console.info(`[api] novidades: a ficha ${ficha.id} pediu as novidades (o lead ${lead.id})`);
  return responder(res, 200, { tipo: "novidades", estado: "pronto" });
});

router.get("/descadastrar/:id/:assinatura", async (req, res) => {
  const lead = await leadDoLink(req);
  if (!lead) return responder(res, 404, { tipo: "descadastrar", estado: "nao-vale" });
  return responder(res, 200, { tipo: "descadastrar", estado: "pedir", email: lead.email, acao: caminhoDoLink("descadastrar", lead.id) });
});

router.post("/descadastrar/:id/:assinatura", soDoSite("descadastrar"), ...limiteSemLogin.links, async (req, res) => {
  const lead = await leadDoLink(req);
  if (!lead || !(await descadastrar(lead.id))) return responder(res, 404, { tipo: "descadastrar", estado: "nao-vale" });
  console.info(`[api] descadastro: o lead ${lead.id} não recebe mais novidades`);
  return responder(res, 200, { tipo: "descadastrar", estado: "pronto" });
});

export default router;
