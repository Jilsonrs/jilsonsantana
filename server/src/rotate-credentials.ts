import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { Role } from "@jilson/core";

// Rotação de credencial de usuário semeado (admin / member de teste).
//
// POR QUE ESTE SCRIPT EXISTE: `seed.ts` é CREATE-ONLY para a senha — se o
// usuário já existe, ele retorna cedo e só reconcilia `role` (seed.ts:59-67).
// Ou seja, re-rodar o seed NUNCA troca a senha de um admin existente. E não há
// outro caminho pronto: `auth.api.setUserPassword` exige o admin plugin (não
// usamos) e `auth.api.setPassword` exige sessão e serve para conta SEM
// credential. Sobra o padrão interno do próprio Better Auth: hashear com o
// hasher dele e gravar em `account.password` onde `providerId = "credential"`.
// (Verificado via context7 `/better-auth/better-auth`; o hash vive no `account`,
// nunca no `user`, e o runtime não configura hasher customizado.)
//
// DISCIPLINA DE SEGREDO (CLAUDE.md → Secrets in agent sessions):
// - a senha nova é gerada AQUI, nunca passa por argumento de CLI;
// - nunca é impressa: o output diz só SET / verificado / revogado;
// - é escrita direto no arquivo de env indicado.
//
// TRAVA: exige o ref do banco esperado como argumento e aborta se a
// DATABASE_URL carregada não bater. Os dois bancos estão a uma variável de
// distância um do outro.
//
// Uso:
//   npx tsx src/rotate-credentials.ts <arquivo-env> <ref-esperado>
//   npx tsx src/rotate-credentials.ts .env      gaxmbnhwltljlkukdwba
//   npx tsx src/rotate-credentials.ts .env.test mvaobzypsiuhqzipcelw

const envFile = process.argv[2];
const expectedRef = process.argv[3];

if (!envFile || !expectedRef) {
  console.error("Uso: tsx src/rotate-credentials.ts <arquivo-env> <ref-esperado>");
  process.exit(1);
}

loadEnv({ path: envFile, override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(`✗ ${envFile} não define DATABASE_URL — abortando.`);
  process.exit(1);
}
if (!databaseUrl.includes(expectedRef)) {
  console.error(`✗ ABORTADO — a DATABASE_URL de ${envFile} não contém o ref "${expectedRef}".`);
  process.exit(1);
}
console.log(`✓ alvo confirmado: ${envFile} → ref ${expectedRef}`);

const prisma = new PrismaClient();

// Espelha a config do runtime no que importa para hash e sign-in. Sem
// `disableSignUp` (não criamos usuário aqui) e sem rateLimit (chamada direta na
// API, não HTTP).
const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, autoSignIn: false },
  user: {
    additionalFields: {
      role: {
        type: [Role.MEMBER, Role.ADMIN],
        required: false,
        defaultValue: Role.MEMBER,
        input: false,
      },
    },
  },
});

/** 24 bytes em base64url: seguro para .env e para `set -a && . ./arquivo`. */
function generatePassword(): string {
  return randomBytes(24).toString("base64url");
}

/** Substitui a linha da chave no arquivo de env, preservando todo o resto. */
function writeEnvValue(path: string, key: string, value: string): void {
  const original = readFileSync(path, "utf8");
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const updated = pattern.test(original)
    ? original.replace(pattern, line)
    : `${original.endsWith("\n") ? original : `${original}\n`}${line}\n`;
  writeFileSync(path, updated, "utf8");
}

async function rotate(emailKey: string, passwordKey: string): Promise<boolean> {
  const email = process.env[emailKey];
  if (!email) {
    console.log(`- ${emailKey} não definido em ${envFile} — pulando.`);
    return true;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`✗ ${emailKey}: usuário não existe neste banco — abortando (não crio usuário aqui).`);
    return false;
  }

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!credential) {
    console.error(`✗ ${emailKey}: sem conta "credential" — abortando (não crio credencial aqui).`);
    return false;
  }

  const newPassword = generatePassword();
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  await prisma.account.update({ where: { id: credential.id }, data: { password: hash } });

  // PROVA EMPÍRICA, não inferência: linha atualizada não é prova de que a conta
  // entra. Se o hash não casar com o verificador do runtime, isto falha aqui —
  // que é exatamente o risco citado em seed.ts:13-15.
  const signIn = await auth.api.signInEmail({ body: { email, password: newPassword } });
  if (!signIn?.user) {
    console.error(`✗ ${emailKey}: senha gravada mas o sign-in NÃO validou — abortando sem escrever no env.`);
    return false;
  }

  // Só depois de verificar: mata TODAS as sessões do usuário, inclusive a que a
  // verificação acabou de criar. Rotação que deixa sessão viva da janela
  // comprometida não é rotação.
  const revoked = await prisma.session.deleteMany({ where: { userId: user.id } });

  writeEnvValue(envFile, passwordKey, newPassword);

  console.log(
    `✓ ${email}: senha rotacionada (SET) · sign-in verificado · ${revoked.count} sessão(ões) revogada(s) · ${passwordKey} atualizado em ${envFile}`,
  );
  return true;
}

async function main(): Promise<void> {
  const okAdmin = await rotate("SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD");
  const okMember = await rotate("SEED_MEMBER_EMAIL", "SEED_MEMBER_PASSWORD");
  if (!okAdmin || !okMember) {
    process.exitCode = 1;
    return;
  }
  console.log("Rotação concluída.");
}

main()
  // Nunca despejar o erro inteiro: o caminho passa por senha em claro
  // (é o mesmo defeito do backlog P2 nº 7 em seed.ts:101).
  .catch((err: unknown) => {
    console.error("Rotação falhou:", err instanceof Error ? err.message : "erro desconhecido");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
