import { randomUUID } from "node:crypto";
import { Prisma, prisma, type OrigemDoLead } from "./prisma.js";

// OS LEADS (etapa 4.7, passo 9 — decisões do operador, 29/10/2026): quem aceitou receber novidades da escola sem ser
// aluno — NOME E E-MAIL, NUNCA O CPF. Um por e-mail, em minúsculas (como a conta). Quem registra: o lembrete e a limpeza
// de quem não terminou de assinar (a caixa marcada ao assinar — `quem-nao-terminou.ts`) e o clique em "Quero receber
// novidades" no lembrete (`routes/novidades.ts`). Descadastrar vale para o E-MAIL: o lead e, se houver conta com ele, a
// caixa de novidades da conta.

/** Um consentimento novo: de onde veio, quando, e quando o e-mail foi PROVADO (o clique num link que a escola mandou àquela caixa). */
export type Consentimento = {
  email: string;
  nome: string | null;
  origem: OrigemDoLead;
  consentimentoEm: Date;
  confirmadoEm: Date | null;
  acquisitionSource: string | null;
  acquisitionCampaign: string | null;
};

/**
 * REGISTRA O CONSENTIMENTO: o lead nasce; o que já existe ganha o que faltava (o nome, a prova do e-mail); o
 * DESCADASTRADO só volta com um consentimento DEPOIS do descadastro — a caixa marcada numa tentativa antiga não desfaz o
 * "não quero mais". Devolve o lead como ficou: o id e se ele recebe novidades.
 */
export async function registrarLead(novo: Consentimento): Promise<{ id: string; ativo: boolean }> {
  const email = novo.email.toLowerCase();
  for (let volta = 0; volta < 2; volta++) {
    const existente = await prisma.lead.findUnique({ where: { email } });
    if (!existente) {
      try {
        const criado = await prisma.lead.create({
          data: {
            id: randomUUID(),
            email,
            nome: novo.nome,
            origem: novo.origem,
            consentimentoEm: novo.consentimentoEm,
            confirmadoEm: novo.confirmadoEm,
            acquisitionSource: novo.acquisitionSource,
            acquisitionCampaign: novo.acquisitionCampaign,
          },
          select: { id: true },
        });
        return { id: criado.id, ativo: true };
      } catch (erro) {
        // Dois ao mesmo tempo (o lembrete e o clique): o outro criou — a volta seguinte o acha.
        if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") continue;
        throw erro;
      }
    }
    const volta = existente.descadastradoEm !== null && novo.consentimentoEm > existente.descadastradoEm;
    const atualizado = await prisma.lead.update({
      where: { id: existente.id },
      data: {
        ...(existente.nome === null && novo.nome ? { nome: novo.nome } : {}),
        ...(existente.confirmadoEm === null && novo.confirmadoEm ? { confirmadoEm: novo.confirmadoEm } : {}),
        ...(volta ? { descadastradoEm: null, consentimentoEm: novo.consentimentoEm, origem: novo.origem } : {}),
      },
      select: { id: true, descadastradoEm: true },
    });
    return { id: atualizado.id, ativo: atualizado.descadastradoEm === null };
  }
  throw new Error("[avisos] o lead não foi registrado: o e-mail mudou duas vezes no meio");
}

/** O lead deste e-mail que RECEBE novidades (não descadastrado) — ou nada. */
export async function leadAtivo(email: string): Promise<{ id: string } | null> {
  return prisma.lead.findFirst({ where: { email: email.toLowerCase(), descadastradoEm: null }, select: { id: true } });
}

/**
 * DESCADASTRA o e-mail deste lead: o lead deixa de receber novidades e, se houver conta com o mesmo e-mail, a caixa de
 * novidades da conta desliga. Repetir não muda nada (vale a data do primeiro). Devolve se o lead existe.
 */
export async function descadastrar(leadId: string, agora: Date = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { email: true, descadastradoEm: true } });
    if (!lead) return false;
    if (lead.descadastradoEm === null) await tx.lead.update({ where: { id: leadId }, data: { descadastradoEm: agora } });
    await tx.user.updateMany({ where: { email: lead.email, marketingConsent: true }, data: { marketingConsent: false } });
    return true;
  });
}
