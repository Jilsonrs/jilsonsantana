import "dotenv/config";
import app from "./app.js";

// Entrada de PRODUÇÃO (`dist/index.js` — o que Dockerfile e Railway executam).
// A montagem do app vive em `app.ts`, que não escuta porta, para que supertest
// possa importá-lo sem subir servidor. Aqui fica só o que é de STARTUP.

// Fail fast in production if a required secret is missing — a clear startup
// error instead of booting and then crashing on an async Better Auth error
// (which previously surfaced only as a confusing Railway healthcheck failure).
// Fica aqui, e não em `app.ts`, porque chama `process.exit(1)`: importado por um
// runner de teste, derrubaria a suíte inteira.
if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  console.error(
    "FATAL: BETTER_AUTH_SECRET must be set in production. Aborting startup.",
  );
  process.exit(1);
}

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
