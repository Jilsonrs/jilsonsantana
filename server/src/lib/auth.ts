import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { Role, TAMANHO_MAXIMO_DA_SENHA, TAMANHO_MINIMO_DA_SENHA, TENTATIVAS_DO_CODIGO, VALIDADE_DO_CODIGO_EM_MINUTOS } from "@jilson/core";
import { enviarCodigo } from "./codigo-por-email.js";
import { CABECALHO_DO_IP, ipDoPedido } from "./limite-de-tentativas.js";

// Better Auth instance (Phase 1). The HTTP handler is mounted on Express in
// index.ts via toNodeHandler — see the middleware-order note there.
//
// Conventions (see CLAUDE.md → Better Auth):
// - Prisma adapter on Neon Postgres; Prisma is the sole DB accessor.
// - Email/password + database sessions (the generated `session` table).
// - Public sign-up stays closed (`disableSignUp: true`): users are created by a
//   trusted trigger (admin/test-member seed in Bloco 3, Stripe webhook in P4),
//   never self-registration.
// - `role` is a custom additionalField storing the lowercase values from the
//   shared `Role` const ("member" / "admin") as a plain String column (not a
//   native Prisma enum — avoids friction on BA CLI regen). `input: false` keeps
//   role out of user-settable signup input.

const prisma = new PrismaClient();

// Dev-only trusted origins for Better Auth's CSRF check. The browser may reach
// the Vite client via localhost, 127.0.0.1, or (in a GitHub Codespace) the
// forwarded HTTPS URL — all distinct origins. None of this runs in production
// (Cloud Run): there NODE_ENV=production, the client is served same-origin by
// Express, and baseURL is trusted implicitly.
function devOrigins(): string[] {
  if (process.env.NODE_ENV === "production") return [];
  const origins = ["http://localhost:5173", "http://127.0.0.1:5173"];
  const name = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (name && domain) origins.push(`https://${name}-5173.${domain}`);
  return origins;
}

// Allow-list: CLIENT_URL (canonical client origin) + the dev origins above.
// Deduplicated; undefined entries (unset CLIENT_URL) filtered out.
const trustedOrigins = [
  ...new Set(
    [process.env.CLIENT_URL, ...devOrigins()].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
];

const baseAuth = betterAuth({
  // Runtime secrets/URLs come from env — never hardcoded. Better Auth also reads
  // BETTER_AUTH_SECRET / BETTER_AUTH_URL implicitly; set explicitly for clarity.
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    // O tamanho da senha, dos mesmos números da tela (`core` → `senhaNovaSchema`).
    minPasswordLength: TAMANHO_MINIMO_DA_SENHA,
    maxPasswordLength: TAMANHO_MAXIMO_DA_SENHA,
    // Trocar a senha pelo código desconecta os outros aparelhos (decisão do operador, 21/10/2026,
    // "como Google e Apple"): quem tinha entrado com a senha antiga perde o acesso na hora.
    revokeSessionsOnPasswordReset: true,
  },

  // O CÓDIGO NO E-MAIL (etapa 4.7, passo 5 — decisões do operador, 21/10/2026): 6 números, 10
  // minutos, 3 tentativas, para ENTRAR sem senha e para criar uma SENHA nova. Guardado só o resumo
  // (`hashed`), nunca o número.
  // TRAVA — `disableSignUp: true` AQUI TAMBÉM: sem ela, entrar com código para um e-mail que não
  // tem conta CRIA a conta na hora (medido no código da 1.7.5, `sign-in/email-otp`) — o cadastro
  // aberto que o `disableSignUp` de cima fecha. A conta só nasce no pagamento (`pedido-do-visitante.ts`).
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: VALIDADE_DO_CODIGO_EM_MINUTOS * 60,
      allowedAttempts: TENTATIVAS_DO_CODIGO,
      storeOTP: "hashed",
      disableSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        await enviarCodigo({ email, otp, type });
      },
    }),
  ],

  // As rotas do Better Auth que a escola NÃO abre por fora (etapa 4.7, passo 5). Pedir código só pela
  // NOSSA rota (`routes/conta-codigo.ts`), que tem os limites por e-mail e por endereço — senão o site
  // serviria para encher a caixa de e-mail de alguém. E nada de link de senha nem de troca de e-mail:
  // a escola usa o código. Ficam abertas as que GASTAM o código (`/sign-in/email-otp` e
  // `/email-otp/reset-password`), com 3 tentativas por código. O servidor continua chamando as
  // desligadas por dentro (`auth.api.*`): o desligamento vale só para o pedido que vem de fora.
  disabledPaths: [
    "/email-otp/send-verification-otp",
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/check-verification-otp",
    "/email-otp/verify-email",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
    "/request-password-reset",
    "/reset-password",
  ],

  // `secure` do cookie FIXADO NO AMBIENTE, nunca inferido da URL.
  //
  // Sem esta linha, o Better Auth 1.6.20 decide `secure` por
  // `baseURL.startsWith("https://")` [medido: dist/cookies/index.mjs:21,32].
  // Como `baseURL` é string e truthy, o fallback por `isProduction` NUNCA é
  // alcançado — ou seja, a segurança do cookie de produção passava a depender da
  // GRAFIA de uma variável de ambiente. `BETTER_AUTH_URL` escrita sem esquema,
  // com `http://`, ou copiada do valor de dev fazia a sessão viajar em claro
  // sem erro, sem log e sem teste que pegasse.
  //
  // A dependência não some — ela MUDA de lugar: sai de uma string de painel não
  // versionada para o `ENV NODE_ENV=production` do Dockerfile, que o git enxerga
  // e o diff revisa. Corolário: no Cloud Run, NODE_ENV é mantido em produção pelo
  // arquivo versionado e pelo Dockerfile.
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // DE ONDE vem o IP que o rate-limit usa para separar uma pessoa da outra.
    //
    // A decisão é de UMA função só — `ipDoPedido`, em `lib/limite-de-tentativas.ts`
    // (Bloco G, etapa G2 — regra PROVISÓRIA até a medição em produção na G4, com
    // `GET /api/diagnostico-ip`, como em 23/09/2026). No mapeamento de domínio do
    // Cloud Run, a frente do Google acrescenta o IP de quem conectou ao fim do
    // `x-forwarded-for`.
    //
    // Por que `pedidoComIpDoPorteiro` (abaixo) normaliza o cabeçalho antes de
    // entregar o pedido ao Better Auth: o `getIPFromHeader` do Better Auth 1.7.5
    // recusa qualquer cabeçalho com mais de um elemento (`forwardedIps.length !== 1`)
    // quando não há `trustedProxies` fixos. Bastaria um visitante mandar um
    // `X-Forwarded-For` forjado (que chega como `forjado, real`) para o IP virar
    // `null` e cair no balde único. `fastly-client-ip`, `true-client-ip`,
    // `cf-connecting-ip` e `x-real-ip` repassam o que o visitante manda no Cloud Run:
    // NUNCA usar.
    //
    // Gatilho de reabertura: a medição na G4 mostrar um salto interno depois do IP
    // do cliente, ou trocar a frente do Cloud Run (pôr um balanceador ou CDN).
    ipAddress: {
      ipAddressHeaders: [CABECALHO_DO_IP],
    },
  },

  // Sessões em banco. `httpOnly` e `sameSite: "lax"` são default hardcoded da
  // versão instalada [dist/cookies/index.mjs:35,37 na 1.7.5] — não os afrouxamos.
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once per day
  },

  // CLAUDE.md: rate-limit auth routes in production. Better Auth's built-in
  // limiter is on by default in production; stated explicitly for visibility.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    // NO BANCO, não na memória (25/10/2026 — o servidor passa a ter até 3 cópias): na memória, cada
    // cópia contaria sozinha, e quem tenta adivinhar uma senha teria 3 vezes as tentativas. A tabela
    // `rateLimit` é a do próprio Better Auth (`npm --workspace server run auth:generate`).
    storage: "database",
  },

  user: {
    additionalFields: {
      role: {
        type: [Role.MEMBER, Role.ADMIN],
        required: false,
        defaultValue: Role.MEMBER,
        input: false,
      },
      // Day+month only (e.g. "06-15") — NEVER the year (LGPD minimization).
      // User-editable later (Account page), so input stays allowed.
      birthday: {
        type: "string",
        required: false,
        input: true,
      },
      // LGPD: gates promotional email only (transactional ignores it). No public
      // consent form in P1, so it is set server-side, not user input.
      marketingConsent: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      // UTM capture — persisted at user creation (seed in P1, Stripe webhook in
      // P4). Always server-injected, never from the model/client.
      acquisitionSource: {
        type: "string",
        required: false,
        input: false,
      },
      acquisitionCampaign: {
        type: "string",
        required: false,
        input: false,
      },
      // Soft-delete — requireAuth rejects users whose deletedAt is set.
      // Admin/system only.
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});

/**
 * Passa o cabeçalho de endereço pelo porteiro único (`ipDoPedido`) antes de o Better Auth ler:
 * reduz a cadeia do `x-forwarded-for` ao IP decidido pela nossa função (ou remove o cabeçalho se
 * não houver IP válido). Assim o Better Auth e `limite-de-tentativas.ts` obedecem exatamente à
 * mesma regra, e um `x-forwarded-for` forjado pelo visitante nunca derruba a resolução do IP.
 */
let avisouLoginSemIp = false;

function pedidoComIpDoPorteiro(pedido: Request): Request {
  const ip = ipDoPedido(pedido.headers.get(CABECALHO_DO_IP));
  if (ip) pedido.headers.set(CABECALHO_DO_IP, ip);
  else {
    pedido.headers.delete(CABECALHO_DO_IP);
    // Sem IP, o Better Auth junta todo mundo num balde só (três erros de qualquer pessoa travam o
    // login da escola) e avisa só no log. Aqui vira alerta, uma vez (revisão de segurança da G2).
    if (process.env.NODE_ENV === "production" && !avisouLoginSemIp) {
      avisouLoginSemIp = true;
      console.error(`[api] login: pedido sem um ${CABECALHO_DO_IP} válido — o limite do login juntou todos num balde só (a frente do Cloud Run mudou o cabeçalho?)`);
    }
  }
  return pedido;
}

const atender = baseAuth.handler;
baseAuth.handler = (pedido: Request) => atender(pedidoComIpDoPorteiro(pedido));
baseAuth.fetch = baseAuth.handler;

export const auth = baseAuth;
