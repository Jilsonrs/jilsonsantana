import { Router } from "express";
import { acaoNaAssinaturaSchema, acharQuerySchema, casosQuerySchema, corrigirDocumentoSchema, corrigirEmailSchema, enviarLinkSchema, fecharCasoSchema, fichaQuerySchema, oQueAconteceuQuerySchema, pedirCodigoDoEmailSchema, resolverCasoSchema } from "@jilson/core";
import type { Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { parseId, validate } from "../lib/http.js";
import { fecharPeloOperador, listarCasos } from "../lib/casos.js";
import { cancelarPeloOperador, conferirPeloOperador, corrigirDocumentoPeloOperador, desfazerCancelamentoPeloOperador, enviarLinkPeloOperador, reenviarPeloOperador, resolverCasoPeloOperador, type NaoFeita, type Resultado } from "../lib/acoes-da-cobranca.js";
import { cobrancaConfigurada } from "../lib/stripe.js";
import { limiteDoCodigoDoEmailNovo } from "../lib/limite-de-tentativas.js";
import { QuemFez } from "../lib/prisma.js";
import { acharPeloCodigo, listarTentativas, montarFicha } from "../lib/ficha-da-cobranca.js";
import { corrigirEmailComCodigo, pedirCodigoDoEmailNovo, type NaoCorrigido } from "../lib/correcao-de-email.js";
import { oQueAconteceu } from "../lib/registro-da-cobranca.js";

// O PAINEL DA COBRANÇA — A FICHA DO ALUNO E O "ACHAR PELO CÓDIGO" (Fase 4, etapa 4.7b, passo 1c). Só admin, só
// leitura: nenhuma destas rotas muda nada na Stripe nem no banco. As operações moram em `lib/ficha-da-cobranca.ts`.

const router = Router();

// GET /api/admin/cobranca/ficha?conta=<id> | ?assinatura=<id do espelho>
router.get("/admin/cobranca/ficha", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const quem = validate(fichaQuerySchema, req.query, res);
  if (quem === null) return;
  const ficha = await montarFicha(quem);
  if (!ficha) {
    res.status(404).json({ error: "NaoEncontrada" });
    return;
  }
  res.json(ficha);
});

// GET /api/admin/cobranca/tentativas — quem começou a assinar e não terminou (passo 1e).
router.get("/admin/cobranca/tentativas", requireAdmin, async (_req, res) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await listarTentativas());
});

// GET /api/admin/cobranca/o-que-aconteceu?pagina=… — o registro da escola inteira e os motivos de cancelamento (passo 1f).
router.get("/admin/cobranca/o-que-aconteceu", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const pedido = validate(oQueAconteceuQuerySchema, req.query, res);
  if (pedido === null) return;
  res.json(await oQueAconteceu(pedido.pagina));
});

// GET /api/admin/cobranca/casos?situacao=abertos|fechados&pagina=… — "Precisa de você" (passo 2c).
router.get("/admin/cobranca/casos", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const pedido = validate(casosQuerySchema, req.query, res);
  if (pedido === null) return;
  res.json(await listarCasos(pedido));
});

// POST /api/admin/cobranca/casos/:id/fechar — o operador fecha o caso, com uma nota opcional (passo 2c).
router.post("/admin/cobranca/casos/:id/fechar", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const corpo = validate(fecharCasoSchema, req.body, res);
  if (corpo === null) return;
  const operador = req.user?.id;
  if (!operador) {
    res.status(401).json({ error: "SemSessao" });
    return;
  }
  if (!(await fecharPeloOperador(id, operador, corpo.nota || null))) {
    res.status(404).json({ error: "NaoEncontrado" });
    return;
  }
  res.json({ fechado: true });
});

// AS AÇÕES (bloco 3): o que não deu para fazer vira um status com nome; o que deu, o que a Stripe respondeu.
const STATUS_DO_QUE_NAO_FOI: Record<NaoFeita, [number, string]> = {
  "nao-encontrada": [404, "NaoEncontrada"],
  ocupada: [409, "Ocupada"],
  "pre-paga": [409, "PrePaga"],
  "nada-a-fazer": [409, "NadaAFazer"],
  "stripe-nao-conhece": [409, "StripeNaoConhece"],
  "assinatura-viva": [409, "AssinaturaViva"],
};
function responder<T>(res: Response, resultado: Resultado<T>): void {
  if (resultado.resultado === "ok") {
    res.json(resultado.feito);
    return;
  }
  const [status, error] = STATUS_DO_QUE_NAO_FOI[resultado.resultado];
  res.status(status).json({ error });
}
/**
 * Quem faz: o operador da sessão. Sem a Stripe configurada, nenhuma ação vai a ela. Sem a conta na sessão (o
 * `requireAdmin` sempre a põe), responde 401 — nunca deixa o pedido pendurado (revisão de segurança do bloco 3).
 */
export function operador(req: { user?: { id: string } }, res: Response): { quem: typeof QuemFez.OPERADOR; conta: string } | null {
  res.set("Cache-Control", "private, no-store");
  if (!cobrancaConfigurada()) {
    res.status(503).json({ error: "NaoConfigurado" });
    return null;
  }
  if (!req.user) {
    res.status(401).json({ error: "SemSessao" });
    return null;
  }
  return { quem: QuemFez.OPERADOR, conta: req.user.id };
}

// POST /api/admin/cobranca/acoes/conferir — { conta } | { assinatura } | { visitante }: a sincronia de sempre (passo 3a).
router.post("/admin/cobranca/acoes/conferir", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const quem = validate(fichaQuerySchema, req.body, res);
  if (quem === null) return;
  responder(res, await conferirPeloOperador(quem, por));
});

// POST /api/admin/cobranca/acoes/cancelar — { assinatura }: a mesma operação de cancelar do aluno (passo 3a).
router.post("/admin/cobranca/acoes/cancelar", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const corpo = validate(acaoNaAssinaturaSchema, req.body, res);
  if (corpo === null) return;
  responder(res, await cancelarPeloOperador(corpo.assinatura, por));
});

// POST /api/admin/cobranca/acoes/desfazer-cancelamento — { assinatura }: a mesma operação de voltar atrás (passo 3a).
router.post("/admin/cobranca/acoes/desfazer-cancelamento", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const corpo = validate(acaoNaAssinaturaSchema, req.body, res);
  if (corpo === null) return;
  responder(res, await desfazerCancelamentoPeloOperador(corpo.assinatura, por));
});

// POST /api/admin/cobranca/casos/:id/reenviar — o e-mail de um caso "e-mail que não saiu" (passo 3a).
router.post("/admin/cobranca/casos/:id/reenviar", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  responder(res, await reenviarPeloOperador(id, por));
});

// POST /api/admin/cobranca/casos/:id/resolver — { acao }: o conserto que o caso pede (passo 3b).
router.post("/admin/cobranca/casos/:id/resolver", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const corpo = validate(resolverCasoSchema, req.body, res);
  if (corpo === null) return;
  responder(res, await resolverCasoPeloOperador(id, corpo.acao, por));
});

// POST /api/admin/cobranca/acoes/corrigir-documento — { conta | visitante, documento }: o CPF ou CNPJ (passo 3b).
router.post("/admin/cobranca/acoes/corrigir-documento", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const corpo = validate(corrigirDocumentoSchema, req.body, res);
  if (corpo === null) return;
  const quem = "conta" in corpo ? { conta: corpo.conta } : { visitante: corpo.visitante };
  const resultado = await corrigirDocumentoPeloOperador(quem, corpo.documento, por);
  if (resultado.resultado === "documento-invalido") {
    res.status(400).json({ error: "DocumentoInvalido" });
    return;
  }
  responder(res, resultado);
});

// POST /api/admin/cobranca/acoes/enviar-link — { conta, link }: o link por e-mail ao aluno (passo 3b).
router.post("/admin/cobranca/acoes/enviar-link", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const corpo = validate(enviarLinkSchema, req.body, res);
  if (corpo === null) return;
  responder(res, await enviarLinkPeloOperador(corpo.conta, corpo.link, por));
});

// CORRIGIR O E-MAIL (passo 3c — P121): o que não deu, com nome.
const STATUS_DA_CORRECAO: Record<NaoCorrigido, [number, string]> = {
  "nao-encontrada": [404, "NaoEncontrada"],
  "conta-de-admin": [409, "ContaDeAdmin"],
  "mesmo-email": [409, "MesmoEmail"],
  "email-de-outra-conta": [409, "EmailDeOutraConta"],
  "email-nao-saiu": [502, "EmailNaoSaiu"],
  "sem-pedido": [409, "CodigoVencido"],
  "codigo-errado": [409, "CodigoErrado"],
  "pagamento-no-email-novo": [409, "PagamentoNoEmailNovo"],
  ocupada: [409, "Ocupada"],
};
function responderACorrecao<T>(res: Response, resultado: { resultado: "ok"; feito: T } | { resultado: NaoCorrigido }): void {
  if (resultado.resultado === "ok") {
    res.json(resultado.feito);
    return;
  }
  const [status, error] = STATUS_DA_CORRECAO[resultado.resultado];
  res.status(status).json({ error });
}

// POST /api/admin/cobranca/acoes/corrigir-email/codigo — { conta, email }: o código vai ao e-mail certo (passo 3c).
router.post("/admin/cobranca/acoes/corrigir-email/codigo", requireAdmin, ...limiteDoCodigoDoEmailNovo, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const corpo = validate(pedirCodigoDoEmailSchema, req.body, res);
  if (corpo === null) return;
  responderACorrecao(res, await pedirCodigoDoEmailNovo(corpo.conta, corpo.email, por));
});

// POST /api/admin/cobranca/acoes/corrigir-email — { conta, email, codigo }: a troca, só com o código (passo 3c).
router.post("/admin/cobranca/acoes/corrigir-email", requireAdmin, async (req, res) => {
  const por = operador(req, res);
  if (!por) return;
  const corpo = validate(corrigirEmailSchema, req.body, res);
  if (corpo === null) return;
  responderACorrecao(res, await corrigirEmailComCodigo(corpo.conta, corpo.email, corpo.codigo, por));
});

// GET /api/admin/cobranca/achar?codigo=<sub_|cus_|pi_|ch_|in_|du_…> — de quem é o código que veio num alerta.
router.get("/admin/cobranca/achar", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const pedido = validate(acharQuerySchema, req.query, res);
  if (pedido === null) return;
  const onde = await acharPeloCodigo(pedido.codigo);
  if (!onde) {
    res.status(404).json({ error: "NaoEncontrada" });
    return;
  }
  res.json(onde);
});

export default router;
