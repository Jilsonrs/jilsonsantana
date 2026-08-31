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
  await page.waitForURL("**/conta");
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
  await expect(page.getByText("Minha conta")).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Cursos" })).toBeVisible();
});

test("logout returns to /login", async ({ page }) => {
  await login(page, MEMBER);
  await page.getByRole("button", { name: "Sair" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong password shows the credentials error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(MEMBER.email);
  await page.getByLabel("Senha").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});
