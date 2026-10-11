// @ts-check
import tseslint from "typescript-eslint";

// O REVISOR AUTOMÁTICO (Fase 4, etapa 4.5 — 10/10/2026). Roda com `npm run lint` e é um passo
// BLOQUEANTE do CI. São TRÊS regras, de propósito — nenhum pacote pronto de regras, nada de
// estilo: cada uma impede uma falha que o typecheck e os testes deixam passar.
//
//   - `no-floating-promises`: a tarefa disparada e não esperada. Se ela falha, ninguém está
//     olhando: vira rejeição sem tratamento e pode DERRUBAR o servidor — o caso do plano é o
//     e-mail mandado sem `await` dentro do aviso da Stripe (`try { enviarEmail() } catch {}` não
//     captura nada). `ignoreVoid: false`: escrever `void tarefa()` NÃO é saída — a promessa é
//     esperada, ou tem tratamento de falha (`.catch`, ou `.then` com os dois lados);
//   - `no-misused-promises`: a função assíncrona posta onde ninguém vai esperar por ela;
//   - `no-explicit-any`: o `any` desliga a verificação de tipo no trecho (CLAUDE.md → General).
//
// ONDE VALE: as três no servidor, no código compartilhado e nos testes de navegador. No SITE
// (client), só a do `any` (decisão do operador, 10/10/2026): as de promessa apontam 20 lugares
// em telas do admin, onde o efeito é um erro na tela, não o servidor caindo.
// O comentário que desliga uma regra sem precisar também reprova: `eslint-disable` só existe
// onde faz diferença, e com o motivo ao lado.

const SEM_ANY = { "@typescript-eslint/no-explicit-any": "error" };
const PROMESSAS = {
  "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: false }],
  "@typescript-eslint/no-misused-promises": "error",
};

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "e2e/playwright-report/**", "e2e/test-results/**"] },
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    // As regras de promessa leem os TIPOS: cada arquivo usa o `tsconfig.json` do seu pacote.
    files: ["server/src/**/*.ts", "core/src/**/*.ts", "e2e/**/*.ts"],
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: { ...PROMESSAS, ...SEM_ANY },
  },
  {
    files: ["client/src/**/*.ts", "client/src/**/*.tsx"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: SEM_ANY,
  },
);
