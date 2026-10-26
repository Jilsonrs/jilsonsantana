import { execFileSync } from "node:child_process";
import {
  loadTestEnv,
  assertTestDatabase,
  childEnv,
  SERVER_ROOT,
} from "./test-env.js";

// globalSetup do Vitest — roda UMA vez, antes de qualquer arquivo de teste.
//
// Ordem obrigatória: TRAVA → reset → migrations → seed.
//
// O seed é parte do setup, não pré-requisito manual: `migrate reset` apaga os
// usuários semeados, então sem semear em seguida a suíte não teria com quem
// autenticar e falharia de forma confusa da segunda execução em diante ("o
// primeiro run passou, o segundo não").

function run(command: string, args: string[], label: string): void {
  process.stdout.write(`[test-setup] ${label}…\n`);
  execFileSync(command, args, {
    cwd: SERVER_ROOT,
    env: childEnv(),
    stdio: "inherit",
  });
}

export default function setup(): void {
  // 1. TRAVA — primeira coisa, antes de qualquer conexão. Se a DATABASE_URL não
  //    for a do banco de teste, isto lança e NADA abaixo executa.
  loadTestEnv();
  assertTestDatabase();
  // O host vem da URL já validada — logar o hostname (nunca a URL, que carrega
  // usuário e senha) diz em UMA linha contra o que a suíte vai rodar.
  process.stdout.write(
    `[test-setup] trava ok — banco local em ${new URL(process.env.DATABASE_URL!).host}\n`,
  );

  // 2. Reset. Desde o Prisma 7 o reset nunca semeia (o `--skip-seed` deixou de existir) nem
  //    gera o cliente: o seed vem logo abaixo, e o cliente já foi gerado (`db:generate`).
  run("npx", ["prisma", "migrate", "reset", "--force"], "migrate reset");
  // O banco de teste em UTC, como o Neon (`lib/prisma.ts` → conferirFusoDoBanco).
  run("npx", ["tsx", "src/test/fuso-utc.ts"], "fuso UTC");

  // 3. Migrations já vêm com o reset (ele reaplica o histórico inteiro), então o
  //    que falta é semear: admin + member, lidos do .env.test.
  run("npx", ["tsx", "src/seed.ts"], "seed");

  process.stdout.write("[test-setup] pronto\n");
}
