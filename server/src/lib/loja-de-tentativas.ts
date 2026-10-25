import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { prisma } from "./prisma.js";

// A CONTAGEM DO LIMITE DE TENTATIVAS, NO BANCO (25/10/2026 — o servidor passa a ter até 3 cópias no
// Cloud Run; plano aprovado pelo operador no mesmo dia). Na memória, cada cópia contava sozinha: com
// 3 cópias, quem testa cartão roubado teria 3 vezes as tentativas. Aqui, todas contam juntas.
//
// - **Uma instrução atômica por pedido** (`INSERT … ON CONFLICT … RETURNING`): duas cópias contando a
//   mesma chave ao mesmo tempo não perdem pedido.
// - **A janela começa no primeiro pedido** e zera sozinha, como na memória: quem passou do teto espera
//   no máximo o que falta da janela. O relógio é o do SERVIDOR, passado ao banco em cada pedido: as
//   cópias do Cloud Run têm o relógio sincronizado pelo Google, e é o relógio que os testes avançam.
// - **Cada limitador tem o seu nome** na frente da chave: o limite por dia e o por 15 minutos de uma
//   mesma rota contam separado, como contavam em lojas separadas.
// - **Linhas vencidas saem de tempos em tempos** (a cada 200 contagens desta cópia, as vencidas há
//   mais de um dia); a linha vencida que volta a ser usada recomeça sozinha.

/** A cada quantas contagens desta cópia as linhas vencidas há mais de um dia são apagadas. */
const LIMPEZA_A_CADA = 200;
let contagensDestaCopia = 0;

type Linha = { contagem: number; zera_em: Date };

/** Agora, para o banco: um instante com fuso, sem depender do fuso de quem lê. */
const agora = (): string => new Date().toISOString();

export class LojaNoBanco implements Store {
  /** As chaves são de todas as cópias (a biblioteca não confere repetição entre lojas locais). */
  localKeys = false;
  prefix: string;
  private janelaEmSegundos = 60;

  constructor(nome: string) {
    this.prefix = `${nome}|`;
  }

  init(opcoes: Options): void {
    this.janelaEmSegundos = opcoes.windowMs / 1000;
  }

  async get(chave: string): Promise<ClientRateLimitInfo | undefined> {
    const [linha] = await prisma.$queryRaw<Linha[]>`
      SELECT contagem, zera_em FROM limite_de_tentativa WHERE chave = ${this.prefix + chave} AND zera_em > ${agora()}::timestamptz`;
    return linha ? { totalHits: linha.contagem, resetTime: linha.zera_em } : undefined;
  }

  async increment(chave: string): Promise<ClientRateLimitInfo> {
    const instante = agora();
    const [linha] = await prisma.$queryRaw<Linha[]>`
      INSERT INTO limite_de_tentativa (chave, contagem, zera_em)
      VALUES (${this.prefix + chave}, 1, ${instante}::timestamptz + make_interval(secs => ${this.janelaEmSegundos}::double precision))
      ON CONFLICT (chave) DO UPDATE SET
        contagem = CASE WHEN limite_de_tentativa.zera_em <= ${instante}::timestamptz THEN 1 ELSE limite_de_tentativa.contagem + 1 END,
        zera_em = CASE WHEN limite_de_tentativa.zera_em <= ${instante}::timestamptz THEN EXCLUDED.zera_em ELSE limite_de_tentativa.zera_em END
      RETURNING contagem, zera_em`;
    contagensDestaCopia += 1;
    if (contagensDestaCopia % LIMPEZA_A_CADA === 0) {
      await prisma.$executeRaw`DELETE FROM limite_de_tentativa WHERE zera_em < ${instante}::timestamptz - interval '1 day'`;
    }
    return { totalHits: linha.contagem, resetTime: linha.zera_em };
  }

  async decrement(chave: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE limite_de_tentativa SET contagem = contagem - 1
      WHERE chave = ${this.prefix + chave} AND zera_em > ${agora()}::timestamptz AND contagem > 0`;
  }

  async resetKey(chave: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM limite_de_tentativa WHERE chave = ${this.prefix + chave}`;
  }

  async resetAll(): Promise<void> {
    await prisma.$executeRaw`DELETE FROM limite_de_tentativa WHERE starts_with(chave, ${this.prefix})`;
  }
}
