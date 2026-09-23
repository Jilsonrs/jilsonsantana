# GEMINI.md — instruções para o parceiro de design

> Você é o **diretor de arte** deste projeto (escola online do Jilson Santana, bilíngue — PT/BR e EN). O Claude Code é a engenharia. Este arquivo diz **onde você mexe, no que precisa ficar
> atento, e como confere que não quebrou nada.**
>
> **Este é o único arquivo desta pasta que vai para o repositório.** Os mocks (`.html`, imagens)
> são exploração local e ficam fora do git de propósito — o que for aprovado é incorporado ao
> `docs/design.md`, que é a lei visual.

---

## 0. DUAS SUPERFÍCIES — leia antes de tudo *(decisão do operador, set/2026)*

O produto tem **duas famílias de tela, e elas não são a mesma coisa com roupa diferente**:

| | **PÁGINA PÚBLICA** | **PÁGINA DE SISTEMA** |
|---|---|---|
| Quem vê | visitante e **Google** | aluno **logado** |
| Para quê | vender, ser encontrada | estudar, acompanhar progresso |
| Tem a barra escura? | **não** | **sim** |
| Como é desenhada | HTML montado no **servidor**, sem React | **React** |
| Onde mora | `server/src/views/**` + `client/src/public-input.css` | `client/src/pages/**` |

**Você trabalha nas DUAS** — muda o caminho até o seu trabalho:

- **Pública:** o operador e o Claude definem o conteúdo → **você faz o mock** na `design-lab/` →
  **o Claude transpõe** para o template de servidor → **você formata o template**. A home (`/`)
  já passou por esse caminho inteiro; é o modelo.
- **De sistema:** o Claude constrói em React com testes → **você formata o `.tsx`** direto.

**Por que a separação existe:** o Google não executa o app do aluno, e o aluno não precisa de
página de venda. Uma tela só faria os dois mal.

---

## 1. O fluxo combinado

1. O operador e o Claude definem **o que vai ter** na tela.
2. Você gera o **mock** em HTML/CSS aqui na `design-lab/`.
3. O Claude **constrói**: template de servidor se a página for pública, React + Tailwind se for de
   sistema (§0). Nos dois casos, com testes.
4. **Você formata o resultado direto no código** — é este passo que faz o acabamento chegar
   inteiro, em vez de se perder na tradução do mock.

**O passo 3 não é uma reinterpretação do seu mock, é uma TRANSPOSIÇÃO:** mesma marcação, mesmas
classes, só os dados entrando. A primeira tentativa na home foi reescrita com classes inventadas e
metade da página ficou sem estilo — e nem o typecheck nem os testes viram, porque nenhum dos dois
olha CSS. Se você receber um template que não parece o seu mock, **avise**.

Você tem liberdade total dentro da `design-lab/`. No código do app, valem as regras abaixo.

---

## 2. Onde você mexe

Caminhos a partir da raiz do projeto. A tabela abaixo é o **básico compartilhado** — o que muda o
produto inteiro. **Cada tela em si está no MAPA DAS TELAS**, mais abaixo nesta seção: lá estão o
endereço, o arquivo e o que vale (ou não vale) acabamento.

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
| `client/tailwind.public.config.ts` | O Tailwind **da vitrine**, separado do app. Herda tema, fontes e cores do config base; muda só o que ele varre. |
| `client/public/css/public.css` | **Saída compilada. Nunca edite à mão** — é gerada pelo comando da §5. |

**São DOIS Tailwind, e a separação tem motivo** *(set/2026)*: o config do app varre
`client/src/**`, e compilar a vitrine com ele fazia a página pública carregar as classes de **toda
tela do React** — 50 KB viraram 68 KB só com uma tela nova de admin, e cresceria a cada tela.
Justamente na página que existe para carregar leve, sem bundle de JS. O config da vitrine varre
**só `server/src/views/**`**, e o CSS voltou para 38 KB.

**O que isso muda para você, na prática:** classe utilitária do Tailwind que você escrever **no
template do servidor** gera CSS normalmente. O que NÃO vale é contar com uma classe só porque ela
existe em alguma tela do React — a vitrine não a enxerga mais. Se precisar, escreva a regra no
`public-input.css`, que é onde o CSS do mock já mora.

### O MAPA DAS TELAS — o que existe, onde abrir, qual arquivo *(set/2026)*

Toda tela do produto, para você não precisar procurar. **Abrir:** o operador sobe os dois
servidores (§5); o React responde em `localhost:5173`, a home pública em `localhost:3000`.

**Públicas — HTML de servidor, SEM React** *(porta 3000)*

| Endereço | Arquivo |
|---|---|
| `/` · `/en` | `server/src/views/home.ts` + `client/src/public-input.css` |

**Públicas — hoje em React, mas PROVISÓRIAS** *(porta 5173)*

| Endereço | Arquivo | Atenção |
|---|---|---|
| `/cursos` | `client/src/pages/CatalogPage.tsx` (`tipo="cursos"`) | ⛔ será substituída |
| `/trilhas` | o MESMO arquivo (`tipo="trilhas"`) | ⛔ idem |
| `/curso/:slug` | `client/src/pages/CourseDetailPage.tsx` | ⛔ idem |
| `/trilha/:slug` | `client/src/pages/TrilhaDetailPage.tsx` | ⛔ idem |
| `/login` | `client/src/pages/LoginPage.tsx` | fica no React |

> **⛔ NÃO invista acabamento nessas quatro.** Elas vão ser **substituídas** por templates de
> servidor, como a home já é (decisão do operador, set/2026: *"eu quero que seja a versão final que
> vamos utilizar"* — sem construir duas vezes). Quando a substituta existir, **você trabalha nela**;
> o que você fizer no `.tsx` de hoje é jogado fora junto com o arquivo. Tokens e CSS sobrevivem,
> marcação não.


**Do aluno — exigem login** *(porta 5173)*

| Endereço | Arquivo |
|---|---|
| `/inicio` | `client/src/pages/StudentHomePage.tsx` |
| `/minhas-trilhas` | `client/src/pages/MyTrilhasPage.tsx` |
| `/minhas-trilhas/:id` | `client/src/pages/MyTrilhaDetailPage.tsx` |
| `/conta` | `client/src/pages/AccountPage.tsx` |

**Do admin — exigem login como admin** *(porta 5173)*

| Endereço | Arquivo |
|---|---|
| `/admin` | `client/src/pages/AdminPage.tsx` |
| `/admin/cursos` | `client/src/pages/admin/AdminCoursesPage.tsx` |
| `/admin/cursos/novo` · `/admin/cursos/:id` | `client/src/pages/admin/AdminCourseFormPage.tsx` |
| `/admin/site` → leva a `/admin/site/textos` | (só redireciona) |
| `/admin/site/textos` | `client/src/pages/admin/AdminSiteTextPage.tsx` + `client/src/components/admin/SiteTextField.tsx` — **uma aba por página** ("Toda página", "Home"; página nova ganha aba sozinha). Com busca, as abas somem e o resultado vem de todas as páginas. As abas têm `aria-pressed` e teste. |
| `/admin/site/depoimentos` | `client/src/pages/admin/AdminTestimonialsPage.tsx` |
| `/admin/site/faq` | `client/src/pages/admin/AdminFaqPage.tsx` |

> **Depoimentos e Perguntas frequentes são a MESMA tela** com nomes diferentes *(Bloco C3,
> 23/09/2026)*. A marcação mora em três componentes compartilhados — formatar um formata os dois:
> `client/src/components/admin/HomeListEditor.tsx` (abas de idioma, botão de novo, lista),
> `HomeListItem.tsx` (o cartão de cada item, com Editar e Excluir) e `HomeListItemForm.tsx` (o
> formulário). As duas páginas só dizem os nomes dos campos.
> **Não mexa sem falar com o operador:** o **Excluir em dois cliques** (ele apaga de vez — é o
> caminho do pedido de remoção por LGPD) e as abas de idioma com `aria-pressed`. Os dois têm teste.
> **"Site" ganhou 2º nível** (Textos · Depoimentos · Perguntas frequentes) na coluna secundária
> (`SecondaryNav.tsx`). Como os itens não têm `grupo`, a coluna mostra o título **"Geral"** — é o
> comportamento atual do componente; se quiser outro visual ali, é conversa com o operador.
> **Na home**, as seções de depoimentos e de perguntas **somem inteiras** quando o idioma não tem
> item publicado (decisão do operador). Ao formatar, não conte com elas sempre presentes.
> **Depoimentos na home: no máximo 4 cards, sorteados a cada visita** (decisão do operador,
> 23/09/2026) — pode haver 1, 2, 3 ou 4. **Sem carrossel e sem script.** No celular, deixar os 4
> lado a lado deslizando com o dedo (CSS `scroll-snap`, sem JavaScript) é opção visual sua — fale
> com o operador. **No admin, depoimento não tem campo Ordem**; pergunta frequente tem.

**PLANEJADAS — aparecem no rail em cinza, com a etiqueta EM BREVE, e NÃO têm tela**

Trilhas Admin · Alunos · JilsonAI Admin · Dados · Certificados · JilsonAI (do aluno).
Elas existem só no mapa de navegação. **Não procure o arquivo: não há.**

## 3. Onde você NÃO mexe

| Arquivo | Por quê |
|---|---|
| `client/src/lib/navigation.ts` | É o **mapa de navegação** — dado, não estilo. Ele decide o que aparece e para quem; você decide como aparece. |
| Qualquer `*.test.tsx` / `*.test.ts` | Se um teste incomodar, **avise** — não edite. Um teste ajustado para passar deixa de proteger. |
| `client/src/components/ui/sheet.tsx` | Vem da biblioteca (shadcn/Radix). |
| `core/src/i18n/pt.ts` e `en.ts` | **É o texto do site** — conteúdo, não estilo, e o operador vai editá-lo pelo admin. Ver regra 9. |
| `core/`, `e2e/`, `prisma/`, e o resto de `server/` | Nada de front ali. **A exceção é `server/src/views/`**, que é a marcação das páginas públicas (§2). |

---

## 4. Doze regras — cada uma já custou tempo aqui

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

**10. Mexeu no `public-input.css`, recompile:** `npm run css:publico`. A vitrine lê
`client/public/css/public.css`, que é **gerado**. Sem rodar o comando, seu CSS não chega na tela —
e não há erro nenhum avisando: você recarrega e simplesmente não mudou nada. **O arquivo gerado é
versionado**, então ele entra no commit junto com a sua mudança.

**11. No mapa de navegação, RÓTULO e ÍCONE são únicos.** Dois itens com o mesmo ícone viram dois
itens indistinguíveis no rail **recolhido**, onde só o ícone aparece. Já aconteceu duas vezes em
uma semana: "Site" nasceu com o ícone do "Catálogo", e "JilsonAI" existia duas vezes (aluno e
admin) com o mesmo ícone e o mesmo nome. **Tem teste** — `navigation.test.ts` reprova rótulo ou
ícone repetido em todo o mapa. Se precisar de um ícone novo, pegue no `lucide-react`.

**12. Seção PLANEJADA é TEXTO, nunca `<a>`.** O rail mostra ao admin as telas que ainda não
existem, em cinza e com a etiqueta EM BREVE, para o operador não esquecer o que falta. Elas **não
podem virar link**: a rota não existe, e clique que leva a lugar nenhum é pior que item ausente.
Vale no rail **e** na gaveta do celular — as duas precisam concordar. **Tem teste.**

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

**Se você mexeu no CSS da vitrine**, recompile antes de olhar (regra 10):
```bash
npm run css:publico
```
*(Era um comando longo e fácil de digitar errado; virou script em set/2026. Ele usa o config
próprio da vitrine — ver §2.)*

Se um teste reprovar e você achar que o teste é que está errado: **não edite o teste, avise.**

Para ver na tela (o operador roda nos terminais dele):
```bash
npm run dev:server      # http://localhost:3000 — a home pública (HTML de servidor)
npm run dev:client      # http://localhost:5173 — todo o resto (React)
```

**Os dois precisam estar de pé**, mesmo para olhar só o React: as telas buscam dados do servidor,
e sem ele você vê o estado de erro em vez da tela.

**Para abrir as telas de aluno e de admin é preciso ENTRAR** — `localhost:5173/login`, com a conta
de admin. **Peça as credenciais ao operador**; elas não ficam escritas em lugar nenhum do repo.
Sem login, `/inicio`, `/conta`, `/admin/*` redirecionam para o login.

---

## 6. A regra que mantém o sistema coerente

**Se você criar algo GERAL — um token novo, um padrão de componente que vai se repetir — isso
precisa subir para `docs/design.md` antes de espalhar pelas telas.** Se for só o arranjo daquela
tela específica, fica na tela.

Sem essa separação, a décima tela tem dez paletas paralelas e ninguém sabe qual vale.

---

## 7. Contexto rápido do que já está construído

- **Navegação em três níveis** (`docs/design.md` §6), e o estado de cada um *(conferido set/2026)*:
  - **Nível 1 — o rail escuro:** construído. Recolhido em 80px, expande para 280px **sobrepondo** o
    conteúdo (`AppRail.tsx`).
  - **Nível 2 — a coluna secundária clara:** **construído** (`SecondaryNav.tsx`, montado no
    `Layout`). Aparece sozinha quando a seção declara `filhos` — hoje "Minha conta" tem 6, e
    "JilsonAI Admin" já tem os dele declarados esperando a tela nascer.
  - **Nível 3 — as abas horizontais:** **NÃO construído.** A função `abasDaRota` existe e tem
    teste, mas **nenhum componente a renderiza ainda**. "Cursos Admin" já declara três abas
    (Publicados · Rascunhos · Arquivados) que hoje não aparecem em lugar nenhum.
    *(A linha anterior deste documento dizia que os níveis 2 e 3 não existiam — estava
    desatualizada quanto ao nível 2.)*
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
