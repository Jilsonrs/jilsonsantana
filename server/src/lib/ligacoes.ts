import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

// AS LIGAÇÕES COM O BANCO (Prisma 7, 26/10/2026). Este arquivo NÃO faz nada ao ser carregado: os
// roteiros de troca de senha (`set-db-password.ts`, `rotate-credentials.ts`) o importam antes de ler
// o arquivo de ambiente. O cliente único do site mora em `prisma.ts`.

/** O endereço nunca entra num erro: ele leva a senha do banco. */
function erroNoEndereco(motivo: string): Error {
  return new Error(`[api] DATABASE_URL ${motivo}`);
}

/** Os modos de TLS aceitos em produção: os dois conferem o certificado e o nome do servidor. */
const TLS_EM_PRODUCAO = ["require", "verify-full"];
/** A própria máquina: ali o TLS não protege nada (e o banco de teste não o tem). */
const ESTA_MAQUINA = ["localhost", "127.0.0.1", "[::1]"];

/**
 * AS LIGAÇÕES DE CADA CÓPIA DO SITE: 10 (decisão do operador, 27/10/2026 — achado P1 da revisão de
 * segurança do passo 6 da etapa 4.7). Antes era o padrão do Prisma 5, `processadores × 2 + 1`, que no
 * Cloud Run, com 1 processador, dava 3 — e 3 assinaturas esperando a Stripe ocupavam todas, travando
 * a aula de quem paga. Num guichê, cada consulta leva milésimos; o que esgota as ligações são as que
 * ficam paradas (as assinaturas — `assinaturas-em-andamento.ts`). Mais que isso não ajuda: uma cópia
 * atende até 160 pedidos ao mesmo tempo, e abrir centenas de ligações num pico gasta o processador.
 */
export const LIGACOES_POR_COPIA = 10;

/**
 * As ligações com o banco. No Prisma 7 quem liga é o `pg`, que tem outros padrões — 10 ligações e
 * espera SEM prazo por uma ligação livre. Aqui: `LIGACOES_POR_COPIA` ligações por cliente e 10 s de
 * espera (o do Prisma 5); e, como no 5, o endereço pode trocá-los com `connection_limit` e
 * `pool_timeout` (o teste do checkout com uma ligação só usa isso). Os dois saem do endereço antes de
 * ele ir ao `pg`.
 *
 * O TLS: o `sslmode=require` vira `verify-full`, que é o que o `pg` já faz com ele (confere o
 * certificado e o nome do servidor). Em PRODUÇÃO ele é obrigatório: sem `sslmode` o `pg` ligaria sem
 * TLS, então entra o `verify-full`; um modo mais fraco é recusado. Assim a proteção da ligação não
 * depende de como o segredo foi escrito (revisão de segurança, 26/10/2026). A exceção é um banco na
 * própria máquina (a suíte roda partes "como em produção" contra o banco local, que não tem TLS) —
 * e só sem `?host=`, que mandaria o `pg` para outro lugar.
 */
export function configuracaoDasLigacoes(endereco: string, emProducao = process.env.NODE_ENV === "production"): PoolConfig {
  let url: URL;
  try {
    url = new URL(endereco);
  } catch {
    // Sem o erro original: o do `new URL` carrega o endereço inteiro, com a senha.
    throw erroNoEndereco("não é um endereço válido");
  }
  const inteiro = (nome: string, minimo: number): number | undefined => {
    const valor = url.searchParams.get(nome);
    url.searchParams.delete(nome);
    if (valor === null) return undefined;
    const numero = Number(valor);
    if (valor.trim() === "" || !Number.isInteger(numero) || numero < minimo) {
      throw erroNoEndereco(`tem ${nome} inválido: use um número inteiro a partir de ${minimo}`);
    }
    return numero;
  };
  const limite = inteiro("connection_limit", 1);
  const esperaEmSegundos = inteiro("pool_timeout", 0);

  const tls = url.searchParams.get("sslmode");
  const nestaMaquina = ESTA_MAQUINA.includes(url.hostname) && !url.searchParams.has("host") && !url.searchParams.has("hostaddr");
  if (emProducao && !nestaMaquina) {
    if (tls !== null && !TLS_EM_PRODUCAO.includes(tls)) {
      throw erroNoEndereco(`em produção precisa conferir o certificado: sslmode=${tls} recusado`);
    }
    if (url.searchParams.has("uselibpqcompat")) throw erroNoEndereco("em produção não aceita uselibpqcompat");
    url.searchParams.set("sslmode", "verify-full");
  } else if (tls === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return {
    connectionString: url.toString(),
    max: limite ?? LIGACOES_POR_COPIA,
    connectionTimeoutMillis: (esperaEmSegundos ?? 10) * 1000,
    idleTimeoutMillis: 300_000,
  };
}

/** Um cliente do banco, com as ligações acima. Sem o endereço, para na hora — e diz por quê. */
/** Quantas ligações o cliente do site abre: o `connection_limit` do endereço, ou as `LIGACOES_POR_COPIA`. */
export function limiteDeLigacoes(endereco = process.env.DATABASE_URL): number {
  return (endereco ? configuracaoDasLigacoes(endereco).max : undefined) ?? LIGACOES_POR_COPIA;
}

export function novoPrisma(endereco = process.env.DATABASE_URL): PrismaClient {
  if (!endereco) throw erroNoEndereco("não configurado: o servidor não tem banco");
  return new PrismaClient({ adapter: new PrismaPg(configuracaoDasLigacoes(endereco)) });
}
