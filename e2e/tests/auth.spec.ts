import { test, expect, type Page } from "@playwright/test";

const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "",
  password: process.env.SEED_ADMIN_PASSWORD ?? "",
};
const MEMBER = {
  email: process.env.SEED_MEMBER_EMAIL ?? "",
  password: process.env.SEED_MEMBER_PASSWORD ?? "",
};

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(creds.email);
  await page.getByLabel("Senha").fill(creds.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
}

test("unauthenticated visit to /conta redirects to /login", async ({ page }) => {
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/login$/);
});

test("unauthenticated visit to /admin redirects to /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("member reaches /conta but is blocked from /admin", async ({ page }) => {
  await login(page, MEMBER);

  // Chega ao catálogo e alcança a conta PELO LINK do cabeçalho — não pela URL.
  // É o caminho que o aluno realmente percorre; se o link sumir, este teste cai.
  await page.getByRole("link", { name: "Minha conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  // `heading` desambigua do link do cabeçalho, que tem o mesmo texto.
  await expect(page.getByRole("heading", { name: "Minha conta" })).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/conta$/);
});

test("admin reaches /admin", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin");

  // Duas asserções, e a primeira é a que carrega o teste: o admin NÃO é
  // redirecionado (o member, no teste acima, é mandado para /conta). Sem ela,
  // uma tela de admin vazia passaria.
  await expect(page).toHaveURL(/\/admin$/);
  // Conteúdo que só existe atrás do AdminRoute. `getByRole` em vez de texto
  // solto: sobrevive a mudança de copy, que é justamente o que quebrou esta
  // spec — ela esperava "Área administrativa", texto renomeado para "Admin" no
  // Bloco 6a e não detectado por meses, porque o E2E não rodava no CI.
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  // Escopado ao conteúdo (`main`) porque a barra lateral também tem um item
  // "Cursos" — os dois apontam para o mesmo lugar, então não é ambiguidade
  // para o aluno, só para o seletor. E o escopo devolve a INTENÇÃO original
  // desta linha: provar que a PÁGINA do admin tem o link, não que a navegação
  // tem. `.first()` faria o teste passar escondendo qual dos dois foi achado.
  await expect(page.getByRole("main").getByRole("link", { name: "Cursos" })).toBeVisible();
});

// A sessão sobreviver ao F5 é o caso que SÓ um browser de verdade prova: depende
// do cookie ter sido gravado com os atributos certos e de o app reidratar a
// sessão a partir dele. Teste de componente não vê isso (a sessão é mockada) e
// teste de servidor também não (não há browser guardando cookie).
// Se este teste quebrar, o sintoma para o aluno é: entrou, apertou F5, foi
// deslogado — e ele desiste antes de abrir chamado.
test("session survives a page reload", async ({ page }) => {
  await login(page, MEMBER);
  await expect(page).toHaveURL(/\/inicio$/);

  await page.reload();

  // Segue logado: continua no catálogo (não foi jogado para /login) e o link de
  // conta — que só aparece para quem tem sessão — continua lá.
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("link", { name: "Minha conta" })).toBeVisible();
});

// O "Sair" mora DENTRO de "Minha conta" desde que a barra lateral substituiu o
// cabeçalho — não existe mais botão global, e é assim de propósito (decisão do
// operador, Set 2026). Por isso o teste percorre o caminho real do aluno: entra,
// abre a conta pelo link, e só então sai.
test("logout returns to /login", async ({ page }) => {
  await login(page, MEMBER);

  await page.getByRole("link", { name: "Minha conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);

  // Escopado ao `main` porque há DOIS "Sair" nesta tela — o da coluna lateral e
  // o do card da conta. `.first()` faria o teste passar sem dizer qual dos dois
  // foi exercido, o mesmo defeito apontado no teste do admin acima.
  await page.getByRole("main").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong password shows the credentials error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(MEMBER.email);
  await page.getByLabel("Senha").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});
