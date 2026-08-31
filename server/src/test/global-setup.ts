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

  // 2. Reset. `--skip-seed` é explícito: hoje não há `prisma.seed` configurado,
  //    mas se alguém adicionar depois, o seed rodaria duas vezes sem isto.
  run("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"], "migrate reset");

  // 3. Migrations já vêm com o reset (ele reaplica o histórico inteiro), então o
  //    que falta é semear: admin + member, lidos do .env.test.
  run("npx", ["tsx", "src/seed.ts"], "seed");

  process.stdout.write("[test-setup] pronto\n");
}
