import { execFileSync } from "node:child_process";
import {
  loadTestEnv,
  assertTestDatabase,
  childEnv,
  SERVER_ROOT,
} from "../server/src/test/test-env.js";

// globalSetup do Playwright — roda UMA vez, antes de qualquer spec e ANTES do
// `webServer` subir.
//
// A trava e o carregamento de env vêm IMPORTADOS de `server/src/test/test-env.ts`,
// nunca copiados. O motivo é o modo de falha de duas cópias: elas divergem, e a
// que diverge é sempre a que ninguém está olhando. Uma cópia só significa que
// endurecer a trava endurece as DUAS suítes de uma vez.
//
// O que isto conserta (achado de Ago 2026): a config antiga lia `../server/.env`
// dentro de um `try/catch` silencioso. Enquanto esse arquivo apontasse para a
// nuvem, `playwright test` autenticava com credencial semeada em produção — e
// nada avisava. O `catch` vazio é o que transformava "sem env de teste" em "roda
// contra o que estiver lá".
//
// Ordem obrigatória, a mesma da suíte de servidor: TRAVA → reset → seed.
// O seed vem depois do reset porque o reset apaga os usuários semeados; sem
// semear em seguida, as specs não teriam com quem autenticar e falhariam só da
// SEGUNDA execução em diante — a pior classe de falha.

function run(command: string, args: string[], label: string): void {
  process.stdout.write(`[e2e-setup] ${label}…\n`);
  execFileSync(command, args, {
    cwd: SERVER_ROOT,
    env: childEnv(),
    stdio: "inherit",
  });
}

export default function globalSetup(): void {
  // 1. TRAVA — antes de qualquer conexão e de qualquer comando destrutivo.
  //    Se a DATABASE_URL não for de um host local, isto lança e nada abaixo roda.
  loadTestEnv();
  assertTestDatabase();
  process.stdout.write(
    `[e2e-setup] trava ok — banco local em ${new URL(process.env.DATABASE_URL!).host}\n`,
  );

  // 2. Reset + 3. seed: os MESMOS comandos da suíte de servidor, não um seed
  //    "parecido". Seed duplicado faz o E2E testar um mundo que o servidor não
  //    tem, e a divergência aparece meses depois como falha intermitente.
  run("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"], "migrate reset");
  run("npx", ["tsx", "src/seed.ts"], "seed");

  process.stdout.write("[e2e-setup] pronto\n");
}
