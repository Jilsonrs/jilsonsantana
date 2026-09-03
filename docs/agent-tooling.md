# Ferramental de agente (fora do app — não é dependência de runtime)

O que está instalado para o agente **trabalhar melhor**, e o que precisa continuar verdadeiro para
isso ser **seguro**. Nada aqui entra no `package.json` do projeto nem na imagem de produção — é
tooling de sessão, não código que roda para o aluno.

> **GATILHO (mecânico):** antes de (re)adicionar o servidor `chrome-devtools`, de atualizar a
> versão pinada, ou de apontar o navegador do agente para **qualquer host que não seja
> `localhost`** → ler este arquivo.

---

## 1. Inventário (Set 2026)

| Peça | O que faz | Escopo | Viaja com o repo? |
|---|---|---|---|
| **Modern Web Guidance** (plugin, `googlechrome`) | busca boas práticas atuais de HTML/CSS/JS de cliente via `npx` | `user` | **NÃO** |
| **`chrome-devtools`** (MCP, `chrome-devtools-mcp@1.8.0`) | dirige um Chrome real: navega, print, console, rede, performance | `local` (este projeto) | **NÃO** |

**Os dois são invisíveis para o git** — vivem em `~/.claude/` e em `~/.claude.json`. Isso é o
oposto do `.claude/agents/`, que é versionado **de propósito** para o
`security-vulnerability-reviewer` viajar com o repo (ver `CLAUDE.md` → *Secrets in agent sessions*).
Aqui a escolha é deliberada: `.mcp.json` em escopo `project` seria commitado e passaria a rodar na
máquina de qualquer um que clonasse. **A contrapartida é que máquina nova não tem nada disto** — a
restauração é a seção 2.

---

## 2. Restaurar (máquina nova, ou depois de limpar config)

```sh
# Plugin de conhecimento (escopo user)
claude plugin marketplace add GoogleChrome/modern-web-guidance
claude plugin install modern-web-guidance@googlechrome --scope user

# Navegador no loop (escopo local — só neste projeto)
claude mcp add chrome-devtools --scope local -- \
  npx -y chrome-devtools-mcp@1.8.0 \
    --redactNetworkHeaders=true \
    --usageStatistics=false \
    --performanceCrux=false \
    --screenshotFormat=webp \
    --screenshotMaxWidth=1400 \
    --screenshotMaxHeight=2400 \
    --viewport=1440x900
```

Conferir com `claude mcp list` — o esperado é `chrome-devtools: … ✓ Connected`.

**Pré-requisitos:** Google Chrome instalado e Node ≥ 22 (o repo está no v22.14.0).

---

## 3. As flags que são SEGURANÇA, não preferência

Copiar o comando sem elas instala uma versão **silenciosamente pior**. Cada uma fecha uma coisa:

- **`--redactNetworkHeaders=true` — a mais importante, e vem DESLIGADA por padrão.**
  Sem ela, inspecionar a rede devolve os cabeçalhos inteiros: **cookie de sessão do Better Auth** e,
  a partir da Fase 3, **URL assinada do Bunny**. Os dois são exatamente o que o `CLAUDE.md` proíbe
  registrar (*"never log secrets, session tokens, signed video URLs"* + *Secrets in agent sessions*),
  e transcrição **não se limpa depois**. Se cair lá, a regra que vale é a de sempre: **rotacione**.
- **`--usageStatistics=false`** — desliga a coleta de uso pelo Google.
- **`--performanceCrux=false`** — impede o envio das URLs visitadas para a API do CrUX. Em
  `localhost` o CrUX não devolve nada útil de qualquer forma, então é custo sem benefício.
- **`--screenshotFormat=webp` + os dois limites** — print em WebP é ~3–5× menor que PNG. É controle
  de **peso de contexto**, não de estética: print grande demais é o que faz a sessão estourar.

**Perfil do Chrome:** por padrão ele usa um perfil próprio em
`~/.cache/chrome-devtools-mcp/`, **não** o Chrome pessoal do operador — por isso `--isolated` não
foi usado (custaria refazer login na admin local a cada sessão, sem ganho real).

---

## 4. Regras de operação

- **SÓ `localhost`. O navegador do agente nunca aponta para produção.** Três razões independentes:
  (a) dirigir a admin em produção **escreve dado real**; (b) print de produção carrega **dado de
  aluno**, e aí é evento de LGPD dentro da transcrição; (c) já é a regra vigente do repo — *só o
  Railway fala com produção* (`CLAUDE.md` → *Separação de ambientes*).
- **Print é dado na transcrição.** Com banco semeado, tudo bem. É por isso que a regra acima é sobre
  o **host**, não sobre a intenção.
- **O navegador NÃO prova fronteira de acesso.** Ele prova aparência e navegação. O repo já tem o
  caso medido: os 7 testes de E2E passaram com o servidor recusando **toda** sessão
  (`CLAUDE.md` → *Testing*). Gate de acesso continua se provando por **supertest**. Tratar print
  verde como prova de gate é a mesma conclusão errada, com uma ferramenta nova.
- **Versão pinada de propósito** (`1.8.0`, não `@latest`): comportamento igual toda vez e sem
  re-resolver pacote a cada abertura.

---

## 5. Gatilhos de reabertura

- **Ao subir a versão do `chrome-devtools-mcp`:** reconferir se `--redactNetworkHeaders` ainda
  existe com esse nome e se o padrão continua **desligado**. Flag renomeada ou default alterado
  falha do jeito ruim — sem erro e sem aviso. Mesma família do `secure` do cookie do Better Auth,
  que foi verificado no **código instalado**, não na documentação.
- **Se o `CLAUDE.md` passar a ter uma seção de tooling de agente com mais peças:** este arquivo vira
  o destino dela, não o `CLAUDE.md` — que já está acima do gatilho de tamanho de ~85 KB.
- **Se algum dia for preciso que o ferramental viaje com o repo** (segunda máquina, ou outra pessoa
  no projeto): aí a decisão de escopo `local` se reabre, e o candidato é `.mcp.json` em escopo
  `project` — com a ressalva de que passa a rodar na máquina de quem clonar.

---

*Set 2026 — arquivo criado ao instalar o Modern Web Guidance e o `chrome-devtools` MCP. Motivo da
instalação: a admin e as páginas internas precisam ser **modernas, responsivas e agradáveis**, e
agente que não vê o que fez entrega o que imagina ter feito. O plugin diz **o que** escrever; o MCP
mostra **como ficou**.*
