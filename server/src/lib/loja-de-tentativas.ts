import { createHmac } from "node:crypto";
import type { Prisma } from "./prisma.js";
import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { prisma } from "./prisma.js";

// A CONTAGEM DO LIMITE DE TENTATIVAS, NO BANCO (25/10/2026 — o servidor passa a ter até 3 cópias no
// Cloud Run; plano aprovado pelo operador no mesmo dia). Na memória, cada cópia contava sozinha: com
// 3 cópias, quem testa cartão roubado — ou tenta adivinhar uma senha — teria 3 vezes as tentativas.
// Aqui, todas contam juntas: a cobrança, o assinar sem login, o código por e-mail e o LOGIN.
//
// - **Uma instrução atômica por pedido** (`INSERT … ON CONFLICT … RETURNING`): duas cópias contando a
//   mesma chave ao mesmo tempo não perdem pedido, e não há transação aberta por pedido.
// - **A janela começa no primeiro pedido** e zera sozinha: quem passou do teto espera no máximo o que
//   falta dela. O relógio é o do SERVIDOR, passado ao banco em cada pedido: as cópias do Cloud Run têm
//   o relógio sincronizado pelo Google, e é o relógio que os testes avançam.
// - **A chave vai CIFRADA** (HMAC com o segredo do servidor): o banco não guarda o e-mail nem o
//   endereço de quem tentou, e nenhum caractere que o visitante mande (um `\u0000`, que o Postgres
//   recusa) vira erro — achados da revisão de segurança, 25/10/2026.
// - **Linhas vencidas há mais de 1 hora saem** a cada 200 contagens desta cópia; a vencida que volta a
//   ser usada recomeça sozinha.

/** A cada quantas contagens desta cópia as linhas vencidas há mais de 1 hora são apagadas. */
const LIMPEZA_A_CADA = 200;
let contagensDestaCopia = 0;

/** Quem conta: o cliente do Prisma de sempre, ou a transação de quem já segura uma trava. */
type Banco = Prisma.TransactionClient;

type Linha = { contagem: number; zera_em: Date };

/** Agora, para o banco: um instante com fuso, sem depender do fuso de quem lê. */
const agora = (): string => new Date().toISOString();

/**
 * Uma MARCA do endereço para o registro (achado P2 da revisão de segurança do passo 6, 27/10/2026): o
 * mesmo endereço dá sempre a mesma marca, e a marca não devolve o endereço — dá para contar recusas
 * por endereço no registro sem guardar IP. Cifrada pelo mesmo segredo das chaves abaixo.
 */
export function marcaDoEndereco(endereco: string): string {
  return chaveGuardada("", `endereco-no-registro\u001f${endereco}`).slice(0, 16);
}

/** A chave como o banco a guarda: o nome do limite, em claro, e quem pediu, cifrado. */
function chaveGuardada(prefixo: string, chave: string): string {
  const segredo = process.env.BETTER_AUTH_SECRET;
  if (!segredo) throw new Error("[api] limite de tentativas sem BETTER_AUTH_SECRET para cifrar as chaves");
  return prefixo + createHmac("sha256", segredo).update(`limite-de-tentativas\u001f${chave}`).digest("hex");
}

/** Conta um pedido na janela desta chave; devolve a contagem e quando ela zera. */
async function contar(guardada: string, janelaEmSegundos: number, db: Banco): Promise<Linha> {
  const instante = agora();
  const [linha] = await db.$queryRaw<Linha[]>`
    INSERT INTO limite_de_tentativa (chave, contagem, zera_em)
    VALUES (${guardada}, 1, ${instante}::timestamptz + make_interval(secs => ${janelaEmSegundos}::double precision))
    ON CONFLICT (chave) DO UPDATE SET
      contagem = CASE WHEN limite_de_tentativa.zera_em <= ${instante}::timestamptz THEN 1 ELSE limite_de_tentativa.contagem + 1 END,
      zera_em = CASE WHEN limite_de_tentativa.zera_em <= ${instante}::timestamptz THEN EXCLUDED.zera_em ELSE limite_de_tentativa.zera_em END
    RETURNING contagem, zera_em`;
  contagensDestaCopia += 1;
  if (contagensDestaCopia % LIMPEZA_A_CADA === 0) {
    await db.$executeRaw`DELETE FROM limite_de_tentativa WHERE zera_em < ${instante}::timestamptz - interval '1 hour'`;
  }
  return linha;
}

/** A loja do `express-rate-limit`, no banco. Duas lojas com o mesmo nome são a mesma contagem. */
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

  async get(chave: string, db: Banco = prisma): Promise<ClientRateLimitInfo | undefined> {
    const [linha] = await db.$queryRaw<Linha[]>`
      SELECT contagem, zera_em FROM limite_de_tentativa
      WHERE chave = ${chaveGuardada(this.prefix, chave)} AND zera_em > ${agora()}::timestamptz`;
    return linha ? { totalHits: linha.contagem, resetTime: linha.zera_em } : undefined;
  }

  /** `db`: quem já segura uma trava conta pela própria transação, sem pedir outra ligação. */
  async increment(chave: string, db: Banco = prisma): Promise<ClientRateLimitInfo> {
    const linha = await contar(chaveGuardada(this.prefix, chave), this.janelaEmSegundos, db);
    return { totalHits: linha.contagem, resetTime: linha.zera_em };
  }

  async decrement(chave: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE limite_de_tentativa SET contagem = contagem - 1
      WHERE chave = ${chaveGuardada(this.prefix, chave)} AND zera_em > ${agora()}::timestamptz AND contagem > 0`;
  }

  async resetKey(chave: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM limite_de_tentativa WHERE chave = ${chaveGuardada(this.prefix, chave)}`;
  }

  async resetAll(): Promise<void> {
    await prisma.$executeRaw`DELETE FROM limite_de_tentativa WHERE starts_with(chave, ${this.prefix})`;
  }
}

/** O nome das tentativas de LOGIN no banco. */
export const PREFIXO_DO_LOGIN = "login|";

/**
 * AS TENTATIVAS DE LOGIN (o `rateLimit.customStorage` do Better Auth 1.7.5 — revisão de segurança,
 * 25/10/2026): a tabela pronta do Better Auth fazia de 2 a 6 consultas, com transação, a cada pedido
 * a `/api/auth/*`, no mesmo caixa de ligações da sessão — quem quisesse atrapalhar deixaria os alunos
 * sem sessão. Aqui é UMA instrução. A chave (o endereço e a rota) continua saindo do Better Auth.
 * Passou do teto: recusa, e diz em quantos segundos a janela libera.
 */
export async function consumirTentativaDeLogin(
  chave: string,
  regra: { window: number; max: number },
): Promise<{ allowed: boolean; retryAfter: number | null }> {
  const linha = await contar(chaveGuardada(PREFIXO_DO_LOGIN, chave), regra.window, prisma);
  if (linha.contagem <= regra.max) return { allowed: true, retryAfter: null };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((linha.zera_em.getTime() - Date.now()) / 1000)) };
}
