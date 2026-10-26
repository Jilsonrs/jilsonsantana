import { availableParallelism } from "node:os";
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
 * As ligações com o banco como o Prisma 5 fazia sozinho. No 7 quem liga é o `pg`, que tem outros
 * padrões — 10 ligações e espera SEM prazo por uma ligação livre. Aqui ficam os do Prisma 5:
 * `processadores × 2 + 1` ligações por cliente (no Cloud Run, 1 processador = 3) e 10 s de espera; e,
 * como no 5, o endereço pode trocá-los com `connection_limit` e `pool_timeout` (o teste do checkout
 * com uma ligação só usa isso). Os dois saem do endereço antes de ele ir ao `pg`.
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
    max: limite ?? availableParallelism() * 2 + 1,
    connectionTimeoutMillis: (esperaEmSegundos ?? 10) * 1000,
    idleTimeoutMillis: 300_000,
  };
}

/** Um cliente do banco, com as ligações acima. Sem o endereço, para na hora — e diz por quê. */
export function novoPrisma(endereco = process.env.DATABASE_URL): PrismaClient {
  if (!endereco) throw erroNoEndereco("não configurado: o servidor não tem banco");
  return new PrismaClient({ adapter: new PrismaPg(configuracaoDasLigacoes(endereco)) });
}
