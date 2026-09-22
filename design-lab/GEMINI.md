# GEMINI.md — instruções para o parceiro de design

> Você é o **diretor de arte** deste projeto (escola online do Jilson Santana, bilíngue — PT/BR e EN). O Claude Code é a engenharia. Este arquivo diz **onde você mexe, no que precisa ficar
> atento, e como confere que não quebrou nada.**
>
> **Este é o único arquivo desta pasta que vai para o repositório.** Os mocks (`.html`, imagens)
> são exploração local e ficam fora do git de propósito — o que for aprovado é incorporado ao
> `docs/design.md`, que é a lei visual.

---

## 1. O fluxo combinado

1. O operador e o Claude definem **o que vai ter** na tela.
2. Você gera o **mock** em HTML/CSS aqui na `design-lab/`.
3. O Claude **constrói** em React + Tailwind, com testes.
4. **Você formata o resultado direto no código** — é este passo que faz o acabamento chegar
   inteiro, em vez de se perder na tradução do mock.

Você tem liberdade total dentro da `design-lab/`. No código do app, valem as regras abaixo.

---

## 2. Onde você mexe

Caminhos a partir da raiz do projeto.

| Arquivo | O que é |
|---|---|
| `client/src/index.css` | **Os tokens** — cores, raio. Mexer aqui muda o produto inteiro de uma vez. |
| `client/tailwind.config.ts` | Fontes, cores expostas como classe, animações |
| `client/src/components/nav/AppRail.tsx` | Nível 1 — o rail escuro |
| `client/src/components/nav/MobileNav.tsx` | A gaveta do celular |
| `client/src/components/Layout.tsx` | O shell e o cabeçalho público |
| `client/src/pages/StudentHomePage.tsx` | A página de início |
| `client/src/components/ui/button.tsx` | Botão base — usado em todas as telas |
| `client/src/components/ui/card.tsx` | Card base |
| `client/src/components/ui/input.tsx` | Campo base (o estado de erro é dirigido por `aria-invalid`) |
| `client/src/fonts.css` | As quatro famílias, hospedadas localmente |

### A parte PÚBLICA saiu do React *(set/2026 — leia antes de abrir a home)*

A home (`/` e `/en`) **não é mais React**. É HTML montado no servidor, sem hidratação, porque
página de marketing é buscar do banco e desenhar — e assim ela carrega sem bundle de JS. O que
isso muda para você:

| Arquivo | O que é |
|---|---|
| `server/src/views/home.ts` | **A marcação da home pública.** É o seu mock transposto: mesma estrutura, mesmas classes. Você formata aqui. |
| `client/src/public-input.css` | **O CSS da home pública** — o do mock, depois das diretivas do Tailwind. Você mexe aqui. |
| `client/public/css/public.css` | **Saída compilada. Nunca edite à mão** — é gerada do arquivo acima (comando na §5). |

O Tailwind já varre `server/src/views/**` (está no `content` do config), então classe usada lá
gera CSS normalmente.

## 3. Onde você NÃO mexe

| Arquivo | Por quê |
|---|---|
| `client/src/lib/navigation.ts` | É o **mapa de navegação** — dado, não estilo. Ele decide o que aparece e para quem; você decide como aparece. |
| Qualquer `*.test.tsx` / `*.test.ts` | Se um teste incomodar, **avise** — não edite. Um teste ajustado para passar deixa de proteger. |
| `client/src/components/ui/sheet.tsx` | Vem da biblioteca (shadcn/Radix). |
| `core/src/i18n/pt.ts` e `en.ts` | **É o texto do site** — conteúdo, não estilo, e o operador vai editá-lo pelo admin. Ver regra 9. |
| `core/`, `e2e/`, `prisma/`, e o resto de `server/` | Nada de front ali. **A exceção é `server/src/views/`**, que é a marcação das páginas públicas (§2). |

---

## 4. Dez regras — cada uma já custou tempo aqui

**1. Classe de Tailwind tem que ser TEXTO LITERAL.**
```tsx
const L = "w-64";
className={`hover:${L}`}   // ❌ NÃO gera CSS. Sem erro de build. O efeito só não acontece.
className="hover:w-64"      // ✅
```
Já aconteceu com a largura do rail. O Tailwind gera CSS **varrendo o texto do arquivo** — se a
string completa não existe no código, a classe não existe no CSS.

**2. Cor só via token.** Nunca hex solto num componente. Se precisa de uma cor nova, ela entra em
`client/src/index.css` como token e é exposta no `tailwind.config.ts`. Um hex perdido num
componente é a cor que ninguém acha quando a marca mudar.

**3. Nunca esconda texto com `hidden` ou `display:none`.** Use **opacidade**: o elemento
transparente continua na árvore de acessibilidade, e quem usa leitor de tela continua ouvindo.
O rótulo do rail recolhido depende disso — e **tem teste**.

**4. Não remova estes atributos:** `aria-current`, `aria-label`, `aria-invalid`, `aria-hidden`,
e as classes `focus-visible:*` e `focus-within:*`. São acessibilidade, vários **têm teste**.
O `focus-within:w-[280px]` do rail é o que faz ele expandir para quem navega por **teclado** —
sem isso, só quem usa mouse consegue ler os rótulos.

**5. Contraste é medido, não estimado.** Texto **4,5:1**; ícone, borda estrutural e texto grande
(≥24px) **3:1**. Já reprovamos duas combinações aqui:
- o azul da marca `#238FE8` sobre azul-claro dá **2,96:1** (reprova) — em superfície clara use
  `--primary-tint-foreground`;
- o cinza da logomarca `#838383` dá **3,79:1** (reprova para texto) — para texto use
  `--muted-foreground`.
No **rail escuro** o azul passa sozinho (5,81:1) e pode ser usado direto.

**6. Tamanho de texto é decisão do operador — não há piso definido por este documento.** Use seu
julgamento de design; se achar que algo ficou pequeno demais para o público (parte dele é de mais
idade, em tela pequena), **levante com ele**, não imponha.

**7. Leveza é requisito técnico, não gosto.** Boa parte do público acessa de aparelho antigo e
conexão instável.
- **Fontes ficam locais** — não voltar para o CDN do Google.
- `prefers-reduced-motion` sempre respeitado (use `motion-reduce:transition-none`).
- Nada de animação em laço contínuo.
- Cuidado com `box-shadow` de blur grande em grade de cards: é das operações de pintura mais caras.

**8. Formatos de imagem estritos (decisão técnica):** SVG para logos e ícones. WebP para fotos e ilustrações (garante leveza). PNG ou JPG (1200x630) EXCLUSIVAMENTE para a imagem OG (Open Graph) de compartilhamento, pois WhatsApp e LinkedIn não lidam bem com WebP.

**9. Nas páginas públicas, NENHUM texto visível fica escrito no template.** Todo texto sai do
dicionário (`core/src/i18n/`), **inclusive `aria-label`, `alt` e `title`**:

```ts
<p>Escolha um objetivo, siga uma trilha pronta.</p>        // ❌
<p>${escapeHtml(dict.home.trilhas.subtitle)}</p>           // ✅
```

**Por quê:** o operador edita esses textos pelo painel, sem deploy — texto cravado no HTML ele
não alcança. E a versão em inglês (`/en`) lê o mesmo dicionário: literal em português aparece
**na página em inglês**. Em set/2026 havia 55 textos assim; hoje há zero, e **a suíte reprova se
um voltar** (o teste compara `/` com `/en`).

Corolários que já quebraram coisa aqui:
- **Texto de dicionário nunca vira caminho de arquivo.** `src="/img/${dict...title}.png"`
  funciona até o operador editar aquele rótulo — aí a imagem some, sem erro.
- **Negrito no meio de um texto = dois campos** (`label` + `text`), nunca `<strong>` dentro da
  string. O operador não digita HTML no painel.
- Precisa de um texto que não existe no dicionário? **Peça a chave**, não escreva no template.
- **A primeira parte da chave diz onde o texto aparece:** `common.*` sai em TODA página pública
  (menu, rodapé), `home.*` só na home. Mexer num `common.*` muda todas as páginas de uma vez.

**10. Mexeu no `public-input.css`, recompile.** A home pública lê `client/public/css/public.css`,
que é **gerado**. Sem rodar o comando da §5, seu CSS não chega na tela — e não há erro nenhum
avisando: você recarrega e simplesmente não mudou nada.

---

## 5. Como você confere que não quebrou nada

```bash
npm run typecheck && npm --workspace client run test
npm --workspace server run test     # se você tocou em server/src/views/
```

**Isto é a rede de segurança de verdade.** Se você apagar sem querer a expansão por teclado, o
`aria-current`, o rótulo do rail, a checagem de papel do admin ou o destino de um link, **a suíte
reprova e diz exatamente qual**. A suíte do servidor cobre as páginas públicas: texto cravado no
template, favicon, `canonical` e `hreflang`. Dentro disso, formate à vontade.

**Se você mexeu no CSS da home pública**, recompile antes de olhar (regra 10):
```bash
cd client && npx tailwindcss -i ./src/public-input.css -o ./public/css/public.css
```

Se um teste reprovar e você achar que o teste é que está errado: **não edite o teste, avise.**

Para ver na tela (o operador roda nos terminais dele):
```bash
npm run dev:server
npm run dev:client      # http://localhost:5173
```

---

## 6. A regra que mantém o sistema coerente

**Se você criar algo GERAL — um token novo, um padrão de componente que vai se repetir — isso
precisa subir para `docs/design.md` antes de espalhar pelas telas.** Se for só o arranjo daquela
tela específica, fica na tela.

Sem essa separação, a décima tela tem dez paletas paralelas e ninguém sabe qual vale.

---

## 7. Contexto rápido do que já está construído

- **Navegação em três níveis** (`docs/design.md` §6): rail escuro recolhido (80px) que expande para
  280px **sobrepondo** o conteúdo · coluna secundária clara (só quando a seção tem subitens) ·
  abas horizontais (só quando a tela tem abas). Os níveis 2 e 3 **ainda não foram construídos** —
  são as próximas fatias.
- **A home pública está no ar**, em HTML de servidor (`/` e `/en`), sem React e sem hidratação.
  Ela é o mock `design-lab/home-lab.html` transposto. **Mock aprovado se TRANSPÕE, não se
  reinterpreta:** a primeira tentativa reescreveu a marcação com classes inventadas e metade da
  página ficou sem estilo — o typecheck e os testes passaram, porque nenhum dos dois olha CSS.
- **Navegação é dado**, não código: cada tela declara seus níveis em `navigation.ts` e o cromo se
  monta sozinho. (Nota: UI bilingue usa textos num dicionário global na implementação).
- **Texto vem do dicionário, e vai virar editável pelo painel.** O texto em `core/src/i18n/` é o
  **valor de fábrica**; em breve o operador sobrescreve pelo `/admin` sem deploy. Por isso a
  regra 9 não é preferência de organização — é o que faz o painel dele funcionar.
- **Fontes:** MuseoModerno (**só a marca**, classe `font-brand`), Outfit (apenas H1 e H2, classe `font-display`), Hanken Grotesk (corpo e títulos menores/H3), JetBrains Mono (etiquetas).
- **O azul `#238FE8` é o acento ÚNICO.** No rail, é o único sinal de "onde estou" — por isso o
  hover ali é neutro.

**A lei visual completa é `docs/design.md`.** Ela é viva: se você tiver algo melhor, proponha e a
gente reescreve. O que não muda sem conversa são as travas de **acessibilidade** — elas não
descrevem gosto, descrevem quem consegue usar o produto.
