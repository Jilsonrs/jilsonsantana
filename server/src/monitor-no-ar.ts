import path from "node:path";
import { fileURLToPath } from "node:url";
import { ligarMonitor } from "./lib/monitor.js";
import { lerVersaoDoApp } from "./lib/versao-do-app.js";

// LIGA O ALERTA DE ERRO (`lib/monitor.ts`) — importado pelo `index.ts` ANTES do `app.ts`, e é
// por isso que é um arquivo à parte: os imports rodam na ordem em que aparecem, e assim uma
// falha ao montar o app (uma rota que quebra ao carregar) já encontra o alerta ligado.
// Só o `index.ts` importa isto: os testes importam o `app.ts`, e nunca ligam o alerta.

const producao = process.env.NODE_ENV === "production";

/** A versão do app que este servidor entrega (a mesma do `X-Versao-Do-App`); fora de produção, nenhuma. */
export const versaoNoAr = producao ? lerVersaoDoApp(path.join(path.dirname(fileURLToPath(import.meta.url)), "../public")) : null;

ligarMonitor({ dsn: process.env.SENTRY_DSN, producao, versao: versaoNoAr });
