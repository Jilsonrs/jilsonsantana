import "dotenv/config";
// O alerta de erro liga AQUI, antes do app: uma falha ao montar o app já o encontra ligado.
import { versaoNoAr } from "./monitor-no-ar.js";
import app from "./app.js";
import { desligarComCalma } from "./lib/desligar.js";
import { avisarQueSubiu, esvaziarMonitor } from "./lib/monitor.js";
import { enderecoDoSite } from "./lib/endereco-do-site.js";

// Entrada de PRODUÇÃO (`dist/index.js` — o que Dockerfile e Cloud Run executam).
// A montagem do app vive em `app.ts`, que não escuta porta, para que supertest
// possa importá-lo sem subir servidor. Aqui fica só o que é de STARTUP.

// Fail fast in production if a required secret is missing — a clear startup
// error instead of booting and then crashing on an async Better Auth error
// (which previously surfaced only as a confusing healthcheck failure).
// Fica aqui, e não em `app.ts`, porque chama `process.exit(1)`: importado por um
// runner de teste, derrubaria a suíte inteira.
if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  console.error(
    "FATAL: BETTER_AUTH_SECRET must be set in production. Aborting startup.",
  );
  process.exit(1);
}

// O ENDEREÇO DOS LINKS DOS E-MAILS (etapa 4.7, passo 5): em produção, `BETTER_AUTH_URL` tem que ser
// https. Não derruba a subida (o site segue no ar): alerta, e o e-mail sai sem o botão até alguém
// corrigir a variável no Cloud Run (`lib/endereco-do-site.ts`).
if (process.env.NODE_ENV === "production" && enderecoDoSite("/") === null) {
  console.error("[email] BETTER_AUTH_URL ausente ou sem https em produção: os e-mails saem sem o botão de entrar");
}

const PORT = process.env.PORT ?? 3000;

const servidor = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Um aviso por subida: é a prova, em produção, de que o alerta chega ao Sentry.
  avisarQueSubiu(versaoNoAr);
});

// Na publicação, o servidor antigo termina o que estava atendendo antes de sair
// (`lib/desligar.ts`; tolerância de 10 s do Cloud Run).
// Antes de sair, espera o envio dos alertas pendentes — e sai do mesmo jeito se a espera falhar.
const sair = () => process.exit(0);
process.on("SIGTERM", () =>
  desligarComCalma(servidor, () => {
    esvaziarMonitor().then(sair, sair);
  }),
);
