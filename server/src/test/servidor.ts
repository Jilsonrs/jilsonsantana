import http from "node:http";
import app from "../app.js";

// O SERVIDOR DOS TESTES — escuta SÓ em 127.0.0.1, um por arquivo de teste, e é
// ele que todo teste passa ao supertest (`request(servidor)`), nunca o `app`.
//
// Por quê (medido em 05/10/2026, não suposto): `request(app)` faz o supertest
// abrir um servidor novo a cada pedido com `listen(0)`, sem endereço. No macOS, um
// programa que abra DEPOIS só em 127.0.0.1 consegue a MESMA porta (o Antigravity e
// os servidores de linguagem do VS Code abrem e fecham portas assim o tempo todo),
// e o pedido do teste — que vai para 127.0.0.1 — chega ao OUTRO programa: 200 de
// 200 portas tomadas no experimento. Era a origem das falhas que mudavam de arquivo
// a cada rodada, nunca apareciam no CI e respondiam "Invalid CSRF token" (texto que
// não existe neste repo). Aberto em 127.0.0.1, o sistema recusa a porta para o
// outro programa: 0 de 200.
//
// Abrir com endereço é ASSÍNCRONO (o supertest lê a porta na hora, por isso não
// dá para só trocar o `listen` dele): o arquivo espera o servidor ficar pronto.
// `unref`: o servidor não segura o processo do teste aberto no fim.
const servidor = http.createServer(app);
await new Promise<void>((pronto, falhou) => {
  servidor.once("error", falhou);
  servidor.listen(0, "127.0.0.1", () => pronto());
});
servidor.unref();

export default servidor;
