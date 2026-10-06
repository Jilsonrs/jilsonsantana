import { Router, type Request, type Response } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";

const router = Router();

// O SINO DE NOTIFICAÇÕES (Bloco E, etapa 4 — decisões do operador, 04/10/2026).
// Tudo exige login e é sempre da PRÓPRIA pessoa: o id vem da sessão, nunca do
// pedido. Quem cria as notificações é `lib/notificacoes.ts`; aqui só se lê e se
// marca como lida. Não filtra por idioma: o que é do aluno aparece nos dois.

/** As mais recentes que o sino e a página "Ver todas" mostram. */
export const LIMITE_DA_LISTA = 50;

/** O id de quem pede, ou 401. */
function pessoa(req: Request, res: Response): string | null {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return id;
}

// GET /api/notificacoes — as mais recentes e quantas estão sem ler.
router.get("/notificacoes", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const [linhas, naoLidas] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: LIMITE_DA_LISTA,
      select: {
        id: true,
        kind: true,
        body: true,
        createdAt: true,
        readAt: true,
        courseTitle: true,
        course: { select: { slug: true, status: true, title: true, welcomeMessage: true, congratsMessage: true } },
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  res.set("Cache-Control", "private, no-store");
  res.json({
    naoLidas,
    itens: linhas.map((n) => {
      // A MENSAGEM DO CURSO MOSTRA O QUE ESTÁ NO ADMIN (decisão do operador,
      // 06/10/2026, P46: corrigir a mensagem corrige também para quem já recebeu;
      // é o e-mail que, depois de chegar, não muda). Só enquanto o curso está
      // PUBLICADO: fora do ar ele pode estar sendo reescrito em rascunho, e o texto
      // e o título novos não podem vazar pelo sino (achado P1 da revisão de
      // segurança, 04/10/2026) — aí vale o que foi copiado no envio. Mensagem
      // apagada no admin também volta ao que chegou.
      const publicado = n.course?.status === ContentStatus.PUBLISHED;
      const textoAtual = publicado ? (n.kind === "PARABENS" ? n.course?.congratsMessage : n.course?.welcomeMessage)?.trim() : undefined;
      return {
        id: n.id,
        tipo: n.kind,
        texto: textoAtual || n.body,
        criadaEm: n.createdAt,
        lida: n.readAt !== null,
        // O link para a página do curso, só enquanto ele está publicado — senão
        // levaria a uma página que não existe.
        curso: n.course
          ? { titulo: publicado ? n.course.title : n.courseTitle, slug: publicado ? n.course.slug : null }
          : null,
      };
    }),
  });
});

// PUT /api/notificacoes/lidas — marca todas como lidas. Antes da rota com `:id`.
router.put("/notificacoes/lidas", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});

// PUT /api/notificacoes/:id/lida — marca uma. A de outra pessoa dá 404, igual à
// que não existe: a rota não diz se o id existe.
router.put("/notificacoes/:id/lida", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const { count } = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  if (count === 0 && !(await prisma.notification.findFirst({ where: { id, userId }, select: { id: true } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.status(204).end();
});

export default router;
