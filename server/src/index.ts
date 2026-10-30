import "./ambiente.js";
// O alerta de erro liga AQUI, antes do app: uma falha ao montar o app já o encontra ligado.
import { versaoNoAr } from "./monitor-no-ar.js";
import app from "./app.js";
import { desligarComCalma } from "./lib/desligar.js";
import { avisarQueSubiu, esvaziarMonitor } from "./lib/monitor.js";
import { enderecoDoSite } from "./lib/endereco-do-site.js";
import { conferirFusoDoBanco } from "./lib/prisma.js";
import { conferirCobrancaNaSubida } from "./lib/conferencia-da-cobranca.js";

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
  // O fuso do banco (Prisma 7: o adaptador do `pg` lê as datas como UTC — `lib/prisma.ts`).
  // O motivo vai DENTRO do texto: com o erro como segundo argumento, o Sentry guardaria só o erro,
  // sem a etiqueta `[api]`, e o alerta seria descartado.
  conferirFusoDoBanco().catch((erro: unknown) =>
    console.error(`[api] não consegui conferir o fuso do banco: ${erro instanceof Error ? erro.message : String(erro)}`),
  );
  // A cobrança (E4 da revisão ampla, 29/10/2026 — `lib/conferencia-da-cobranca.ts`): as chaves da Stripe no mesmo
  // modo, e o endereço de avisos ligado com todos os avisos que o site trata. Só em produção: em dev os avisos
  // chegam pelo `stripe listen`, sem endereço cadastrado.
  if (process.env.NODE_ENV === "production") {
    conferirCobrancaNaSubida().catch((erro: unknown) =>
      console.error(`[stripe] subida: a conferência da cobrança falhou: ${erro instanceof Error ? erro.message : String(erro)}`),
    );
  }
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
