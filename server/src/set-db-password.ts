import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Grava a senha do Postgres nas connection strings de um arquivo de env e
// PROVA que ela conecta — em vez de anunciar sucesso.
//
// POR QUE ESTE SCRIPT EXISTE: a primeira versão disto era um one-liner que
// imprimia "atualizadas (SET)" INCONDICIONALMENTE, tivesse o regex casado ou
// não, e conectasse ou não. Ou seja: um gate que mente — o mesmo defeito do
// `lint` que rodava `tsc` (apagado no Bloco 0 da Fase 3). Custou uma rodada de
// diagnóstico às cegas. Aqui, se a conexão não subir, o arquivo é RESTAURADO ao
// estado anterior e o script sai com erro.
//
// DISCIPLINA DE SEGREDO (CLAUDE.md → Secrets in agent sessions): a senha entra
// por variável de ambiente vinda de um `read -rs` (prompt oculto), NUNCA como
// argumento de CLI — argumento vai parar no histórico do shell. Nada do valor
// aparece no output.
//
// Uso (portável bash/zsh — `read -p` NÃO é prompt no zsh):
//   printf "Senha: " && read -rs PGPW && echo && \
//     PGPW="$PGPW" npx tsx src/set-db-password.ts .env.test mvaobzypsiuhqzipcelw && unset PGPW

const envFile = process.argv[2];
const expectedRef = process.argv[3];
const password = process.env.PGPW;

if (!envFile || !expectedRef) {
  console.error("Uso: PGPW=… tsx src/set-db-password.ts <arquivo-env> <ref-esperado>");
  process.exit(1);
}
if (!password) {
  console.error("✗ PGPW não veio no ambiente — abortando (não aceito senha por argumento).");
  process.exit(1);
}

const original = readFileSync(envFile, "utf8");
if (!original.includes(expectedRef)) {
  console.error(`✗ ABORTADO — ${envFile} não menciona o ref "${expectedRef}".`);
  process.exit(1);
}

const encoded = encodeURIComponent(password);

/** Troca só o segmento de senha da URL, preservando usuário, host, porta e query. */
function replacePassword(source: string, key: string): { text: string; matched: boolean } {
  const pattern = new RegExp(`^(${key}=postgresql://[^:@/]+:)[^@]*(@.*)$`, "m");
  if (!pattern.test(source)) return { text: source, matched: false };
  return { text: source.replace(pattern, `$1${encoded}$2`), matched: true };
}

const step1 = replacePassword(original, "DATABASE_URL");
const step2 = replacePassword(step1.text, "DIRECT_URL");

if (!step1.matched || !step2.matched) {
  console.error(
    `✗ ABORTADO — regex não casou (DATABASE_URL: ${step1.matched ? "ok" : "FALHOU"}, DIRECT_URL: ${step2.matched ? "ok" : "FALHOU"}). Arquivo NÃO alterado.`,
  );
  process.exit(1);
}

writeFileSync(envFile, step2.text, "utf8");

// PROVA: recarrega o arquivo já gravado e tenta conectar de verdade.
loadEnv({ path: envFile, override: true });
const url = process.env.DATABASE_URL;
if (!url) {
  writeFileSync(envFile, original, "utf8");
  console.error("✗ DATABASE_URL ausente após a escrita — arquivo RESTAURADO.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: url });

async function main(): Promise<void> {
  try {
    await prisma.$queryRaw`select 1`;
    console.log(`✓ conexão VERIFICADA — ${envFile} atualizado (ref ${expectedRef}).`);
  } catch (err: unknown) {
    writeFileSync(envFile, original, "utf8");
    const message = err instanceof Error ? err.message.split("\n")[0] : "erro desconhecido";
    console.error(`✗ a senha gravada NÃO conecta — arquivo RESTAURADO ao estado anterior.`);
    console.error(`  motivo: ${message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
