// O LEMBRETE DE ATUALIZAR O STACK (pedido do operador, 25/10/2026: "me lembrar todo janeiro ou a
// cada 6 meses de atualizar o stack para manter sempre sincronizado com o Google"). O GitHub roda
// isto em 1º de janeiro e 1º de julho (`.github/workflows/lembrete-do-stack.yml`) e abre um aviso,
// que chega por e-mail ao operador, com o que está velho: a versão do Node no contêiner e quando ela
// sai de suporte, a LTS mais nova, e as bibliotecas atrasadas. SÓ LÊ: quem atualiza é o Claude, com
// o OK do operador (`docs/tech-stack.md` → *Atualizações*).
//
// Uso: `node scripts/lembrete-do-stack.mjs` (da raiz, com as bibliotecas instaladas) — escreve o
// aviso em Markdown na saída.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const hoje = new Date();
const data = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const diasAte = (iso) => Math.round((new Date(`${iso}T00:00:00Z`).getTime() - hoje.getTime()) / 86_400_000);

// O Node que o contêiner usa (a primeira etapa do Dockerfile; todas usam a mesma).
const usado = Number(/FROM node:(\d+)/.exec(readFileSync("Dockerfile", "utf8"))?.[1]);

// O calendário oficial do Node.js: quando cada versão entra em suporte longo e quando sai.
const resposta = await fetch("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json");
if (!resposta.ok) throw new Error(`calendário do Node.js indisponível: ${resposta.status}`);
const calendario = await resposta.json();
const versoes = Object.entries(calendario)
  .map(([nome, v]) => ({ major: Number(nome.replace(/^v/, "")), ...v }))
  .filter((v) => Number.isInteger(v.major));
const doUsado = versoes.find((v) => v.major === usado);
const ltsMaisNova = versoes
  .filter((v) => v.lts && new Date(v.lts) <= hoje && new Date(v.end) > hoje)
  .sort((a, b) => b.major - a.major)[0];

// As bibliotecas atrasadas. O `npm outdated` termina com código 1 quando há alguma: a saída vem no erro.
let bruto = "{}";
try {
  bruto = execFileSync("npm", ["outdated", "--json", "--workspaces", "--include-workspace-root"], { encoding: "utf8" });
} catch (erro) {
  bruto = erro.stdout || "{}";
}
const major = (versao) => Number(String(versao ?? "").split(".")[0]);
const atrasadas = Object.entries(JSON.parse(bruto)).flatMap(([nome, info]) =>
  (Array.isArray(info) ? info : [info])
    // Versão de teste (`-rc`, `-beta`) não é para atualizar.
    .filter((i) => i.current && i.latest && i.current !== i.latest && !String(i.latest).includes("-"))
    .map((i) => ({ nome, atual: i.current, nova: i.latest, onde: i.dependent ?? "raiz" })),
);
const unicas = [...new Map(atrasadas.map((a) => [`${a.nome}@${a.atual}`, a])).values()]
  // Os tipos do Node acompanham a versão do contêiner de propósito: não estão "atrasados".
  .filter((a) => !(a.nome === "@types/node" && major(a.atual) === usado));
const grandes = unicas.filter((a) => major(a.nova) > major(a.atual));
const pequenas = unicas.filter((a) => major(a.nova) === major(a.atual));

const linhas = [];
linhas.push(`Lembrete semestral (1º de janeiro e 1º de julho). **O Google cuida da máquina; o que vai dentro do contêiner — o Node, as bibliotecas e o código — é nosso.**`, "");
linhas.push("### Node.js");
if (doUsado) {
  const dias = diasAte(doUsado.end);
  linhas.push(`- No contêiner: **Node ${usado}** — suporte até **${data(doUsado.end)}** (${dias >= 0 ? `faltam ${dias} dias` : `**sem suporte há ${-dias} dias**`}).`);
} else {
  linhas.push(`- No contêiner: **Node ${usado}** — fora do calendário oficial (versão de teste ou já retirada).`);
}
if (ltsMaisNova) {
  linhas.push(`- Suporte longo mais novo: **Node ${ltsMaisNova.major}** — suporte até ${data(ltsMaisNova.end)}.`);
  linhas.push(ltsMaisNova.major > usado ? `- **Trocar para o Node ${ltsMaisNova.major}** — no contêiner, no CI e no seu computador.` : "- O contêiner já está no suporte longo mais novo.");
}
linhas.push("", "### Bibliotecas");
if (grandes.length === 0 && pequenas.length === 0) {
  linhas.push("- Todas em dia.");
} else {
  linhas.push(`- **${grandes.length} com versão nova GRANDE** (pode exigir mudança no código — uma por vez, com plano):`);
  for (const a of grandes) linhas.push(`  - \`${a.nome}\` ${a.atual} → ${a.nova} (${a.onde})`);
  linhas.push(`- **${pequenas.length} com correção ou versão pequena** (costumam entrar juntas, com os testes).`);
}
linhas.push("", "### O que fazer");
linhas.push("- [ ] Pedir ao Claude: *\"atualizar o stack conforme o lembrete\"* — ele monta o plano, roda os testes e publica com o seu OK.");
linhas.push("- [ ] No seu computador: o Node na mesma versão do contêiner (instalador oficial, nodejs.org).");
linhas.push("- [ ] Fechar este aviso quando terminar.");
process.stdout.write(`${linhas.join("\n")}\n`);
