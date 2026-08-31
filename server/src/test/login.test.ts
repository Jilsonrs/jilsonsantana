import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

// Suíte de SERVIDOR do login — a fronteira de acesso, que NÃO TEM TELA.
//
// Por que existe além dos 13 testes de componente: aqueles mockam
// `@/lib/auth-client`, então provam que o FORMULÁRIO se comporta. Nenhum deles
// prova que o servidor recusa quem deve recusar — e é isso que separa "a tela
// está bonita" de "o acesso está protegido". Critério 4 da Definição de pronto
// por fatia: rota que toca acesso exige teste de servidor.
//
// Estes testes MEDEM o comportamento do Better Auth instalado em vez de assumir
// o que a documentação descreve. Onde a medição contrariar a expectativa, o
// comentário registra o que foi medido.

const SIGN_IN = "/api/auth/sign-in/email";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Faltou ${name} no .env.test`);
  return value;
}

const ADMIN_EMAIL = () => requireEnv("SEED_ADMIN_EMAIL");
const ADMIN_PASSWORD = () => requireEnv("SEED_ADMIN_PASSWORD");

/** Extrai o cookie de sessão da resposta. supertest tipa `headers` de forma frouxa. */
function cookiesFrom(res: request.Response): string[] {
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

describe("login — caminho feliz", () => {
  it("credencial correta devolve 200 e emite cookie de sessão", async () => {
    const res = await request(app)
      .post(SIGN_IN)
      .send({ email: ADMIN_EMAIL(), password: ADMIN_PASSWORD() });

    expect(res.status).toBe(200);
    expect(cookiesFrom(res).length).toBeGreaterThan(0);
  });

  it("a sessão emitida é utilizável — linha criada não prova sessão", async () => {
    const signIn = await request(app)
      .post(SIGN_IN)
      .send({ email: ADMIN_EMAIL(), password: ADMIN_PASSWORD() });

    const me = await request(app).get("/api/me").set("Cookie", cookiesFrom(signIn));

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(ADMIN_EMAIL());
  });
});

describe("login — o que tem que ser RECUSADO", () => {
  it("senha errada não autentica e não emite sessão", async () => {
    const res = await request(app)
      .post(SIGN_IN)
      .send({ email: ADMIN_EMAIL(), password: "senha-definitivamente-errada" });

    // 401 EXATO, não "diferente de 200": um 500 (servidor quebrado) passaria no
    // frouxo e seria lido como "acesso negado corretamente".
    expect(res.status).toBe(401);
    const sessionCookie = cookiesFrom(res).find((c) => c.includes("session"));
    expect(sessionCookie).toBeUndefined();
  });

  it("e-mail inexistente não autentica", async () => {
    const res = await request(app)
      .post(SIGN_IN)
      .send({ email: "nao-existe@exemplo.invalido", password: "qualquer-coisa" });

    expect(res.status).toBe(401);
  });

  // ENUMERAÇÃO DE USUÁRIO: se "senha errada" e "e-mail inexistente" respondem
  // de formas distinguíveis, qualquer um descobre QUAIS e-mails têm conta na
  // escola — sem precisar de senha. Numa escola isso é lista de alunos.
  it("senha errada e e-mail inexistente são INDISTINGUÍVEIS de fora", async () => {
    const senhaErrada = await request(app)
      .post(SIGN_IN)
      .send({ email: ADMIN_EMAIL(), password: "senha-definitivamente-errada" });

    const naoExiste = await request(app)
      .post(SIGN_IN)
      .send({ email: "nao-existe@exemplo.invalido", password: "senha-definitivamente-errada" });

    expect(naoExiste.status).toBe(senhaErrada.status);
    expect(naoExiste.body).toEqual(senhaErrada.body);
  });

  it("senha vazia não autentica", async () => {
    const res = await request(app).post(SIGN_IN).send({ email: ADMIN_EMAIL(), password: "" });
    expect(res.status).toBe(401);
  });

  // A tela agora bloqueia isto antes de chegar aqui (`.refine` no loginSchema),
  // mas a tela não é a fronteira: quem chama a API direto pula o formulário.
  it("senha só de espaços não autentica", async () => {
    const res = await request(app).post(SIGN_IN).send({ email: ADMIN_EMAIL(), password: "   " });
    expect(res.status).toBe(401);
  });
});

describe("login — normalização de e-mail (decisão do SERVIDOR, não da tela)", () => {
  // O caso (10) da lista do plano. `ADMIN@X.COM` passa a validação do client;
  // quem decide se autentica é o Better Auth. É o chamado clássico de "não
  // consigo entrar" — e a resposta só existe medindo.
  it("e-mail em MAIÚSCULAS: o comportamento fica REGISTRADO por medição", async () => {
    const res = await request(app)
      .post(SIGN_IN)
      .send({ email: ADMIN_EMAIL().toUpperCase(), password: ADMIN_PASSWORD() });

    // Se autenticar, o Better Auth normaliza a caixa e não há nada a fazer.
    // Se NÃO autenticar, existe um chamado de suporte esperando para acontecer,
    // e o fix é normalizar no servidor — nunca só na tela.
    expect([200, 401]).toContain(res.status);
    if (res.status !== 200) {
      // Falha proposital com mensagem útil: transforma "descobri em produção"
      // em "descobri no CI".
      throw new Error(
        "ACHADO: e-mail em MAIÚSCULAS NÃO autentica. O aluno que salvar o " +
          "e-mail capitalizado no gerenciador de senhas fica trancado para fora. " +
          "Normalizar a caixa no servidor.",
      );
    }
  });
});

describe("login — cadastro fechado", () => {
  // `disableSignUp: true` é o que impede conta nova sem passar pelo Stripe
  // (Fase 4). Sem teste, alguém desliga na config e nada avisa.
  it("sign-up público é recusado", async () => {
    const res = await request(app).post("/api/auth/sign-up/email").send({
      email: "invasor@exemplo.invalido",
      password: "SenhaForte123!",
      name: "Invasor",
    });

    // 400 + código exato, verificado na documentação do Better Auth
    // (context7, Ago 2026): a recusa acontece ANTES de qualquer escrita no banco.
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
  });
});

describe("login — o cookie de sessão", () => {
  it("é httpOnly e tem sameSite — sem httpOnly, qualquer XSS lê a sessão", async () => {
    const res = await request(app)
      .post(SIGN_IN)
      .send({ email: ADMIN_EMAIL(), password: ADMIN_PASSWORD() });

    const sessionCookie = cookiesFrom(res).find((c) => c.includes("session"));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.toLowerCase()).toContain("httponly");
    expect(sessionCookie!.toLowerCase()).toContain("samesite");
  });
});
