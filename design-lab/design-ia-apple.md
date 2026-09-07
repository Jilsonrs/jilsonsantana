# 🎨 Design System: "IA Apple" (Elegância & Harmonia)

Este documento atua como a **fonte da verdade visual e estrutural** para o front-end do projeto. Qualquer agente ou desenvolvedor que for criar novas telas para o sistema deve ler e seguir estritamente as diretrizes abaixo.

---

## 0. Manifesto de Design & Workflow

- **Parceria Criativa (Design Partner):** O agente Gemini atua como o Diretor de Arte e Design. Ele é responsável por conceber, iterar e construir os mockups e protótipos de interface (como os arquivos HTML no diretório `design-lab`).
- **Implementação (Engenharia):** Após a criação e aprovação do mockup visual pelo usuário, o agente **Claude Code** assume a responsabilidade de fatiar, implementar e integrar esse design aos componentes oficiais da aplicação. Cada agente foca no que faz de melhor.
- **DNA "Apple" & IA:** O design da escola deve respirar inovação, minimalismo e elegância. Tem que ser extremamente agradável de ver, intuitivo de navegar e despertar o desejo imediato de uso. A inteligência artificial não deve parecer intimidadora, mas sim natural e fluida.
- **Acessibilidade de Performance (Realidade Brasileira):** Mesmo entregando uma estética *premium*, o código final **deve ser extremamente leve**. A maioria dos usuários brasileiros acessa a internet por dispositivos mais antigos ou conexões móveis intermitentes. Portanto, o uso de CSS nativo (Vanilla) e HTML semântico não é apenas uma escolha estética, é uma exigência técnica para garantir velocidade e acessibilidade sem onerar o dispositivo do usuário com bibliotecas pesadas.

---

## 1. Identidade e Conceito (Moodboard)
O design busca uma estética **editorial, imaculada e de alta tecnologia ("estilo Apple")**, com a inteligência artificial enraizada ("IA no DNA"). O visual divide-se entre um modo escuro profundo (imersivo) na navegação e um modo claro e cirúrgico no conteúdo.
- **Sensação:** Profissional, premium, silencioso, harmonioso.
- **Inspirações:** Impacta Claude Pro (Tipografia mista e linhas de luz), Vercel/Stripe (Bordas finas e micro-interações suaves).

---

## 2. Paleta de Cores (CSS Tokens)
As cores baseiam-se na identidade "Jilson Santana" + "Hashtag", enriquecidas com tons de superfície e bordas sutis.

```css
:root {
  /* Marcas Oficiais */
  --brand-blue: #238FE8;    /* Acento principal, botões, glows, links ativos */
  --brand-black: #000000;   /* Títulos fortes */
  --brand-gray: #838383;    /* Subtítulos e texto de apoio */
  
  /* Superfícies - Área Clara (Conteúdo) */
  --bg-content: #FFFFFF;    /* Fundo da tela de conteúdo */
  --surface-alt: #F8FAFC;   /* Fundo da coluna secundária (cinza super leve) */
  --text-main: #0A0A0B;     /* Texto principal escuro (quase preto) */
  --text-muted: #52525B;    /* Texto de parágrafos */
  
  /* Superfícies - Área Escura (Rail de Navegação) */
  --rail-bg-solid: #0A0A0B; /* Preto profundo / ardósia */
  --rail-icon: #A1A1AA;     /* Ícones inativos */
  
  /* Linhas e Bordas (Elegância máxima) */
  --border-color: rgba(0,0,0,0.06); 
  --border-fine: rgba(0,0,0,0.03); /* Linhas "fio de cabelo" invisíveis mas presentes */
}
```

---

## 3. Tipografia (A alma da interface)
A interface ganha seu aspecto editorial misturando quatro fontes distintas (importadas via Google Fonts).

1. **Títulos e Logo (`MuseoModerno`):** Pesos 600/700. Usado para H1, H2, H3 e tipografia grande.
2. **Corpo do Texto (`Hanken Grotesk`):** Pesos 400/500/600. Usado para parágrafos, menus e botões. Excelente leiturabilidade.
3. **Ênfase Editorial (`Playfair Display - Italic`):** Peso 600 itálico. Usado para *destacar uma única palavra* no meio de um título moderno (Ex: Stack *moderno*). Aplique a classe `.emphasis` e cor `--brand-blue`.
4. **Micro-cópias e Tags (`JetBrains Mono`):** Usado para etiquetas (`[ SKILLS • COWORK ]`), subtítulos pequenos e indicativos técnicos. Letras maiúsculas e bem espaçadas (`letter-spacing: 0.1em`).

---

## 4. Arquitetura de Layout (3 Níveis Inegociáveis)
A tela é sempre estruturada usando Flexbox em altura fixa (`height: 100vh; overflow: hidden;`), dividida em 3 colunas:

### Nível 1: Rail Escuro (Esquerda)
- Fundo escuro (`#0A0A0B`).
- Estado recolhido: 80px (mostra apenas ícones e o logotipo em `#`).
- Estado expandido (`hover/focus-within`): 280px (sobrepõe o conteúdo usando `position: absolute` ou crescendo sem quebrar o layout, usa sombra densa `box-shadow: 20px 0 50px rgba(0,0,0,0.4)`).
- **Logotipo:** Texto em CSS (`<div class="logo-icon-only">#</div>` e `<div class="logo-full">#Jilson Santana</div>`).
- **Estado Ativo (Glow Timeline):** O link ativo ganha um ponto luminoso azul (`box-shadow` radial) e uma linha fina (gradiente) descendo, imitando uma jornada/timeline.

### Nível 2: Coluna Secundária (Meio)
- Só aparece quando necessário (configurações, listas de aulas de um módulo).
- Fundo claro/cinza (`#F8FAFC`). Largura fixa (~280px).
- Usa muito acordeão (`details`/`summary`) no estilo FAQ (ícone de `+` que vira `x`, bordas inferiores `--border-fine`).

### Nível 3: Área Principal de Conteúdo (Direita)
- Fundo totalmente branco. `overflow-y: auto`.
- Onde os cards, grids e vídeos vivem.
- Detalhe de "Luz de IA": Fundo possui um `radial-gradient` invisível azul muito suave (opacity 3%) no canto superior para dar volume e DNA de IA.

---

## 5. Componentes Visuais

### A. Grids e Cards
- Cartões com fundo `#FFFFFF`, bordas extremamente finas (`1px solid var(--border-fine)`) e `border-radius: 12px` ou `16px`.
- Efeito Hover: O cartão levanta sutilmente (`translateY(-4px)`), a sombra aumenta um pouco e a borda fica sutilmente azul.
- Ícones dentro dos cards ficam num círculo com fundo `--surface-alt` e cor `--brand-blue`.

### B. Listas Customizadas
- Nunca usar bolinhas (`ul/li` padrão).
- Substituir o *bullet* por um travessão estilizado colorido (`content: '—'; color: var(--brand-blue); font-weight: 700;`). Estilo corporativo premium.

### C. IA Prompt Input
- Campos de pesquisa ou interação com agente recebem cantos arredondados, ícone dentro e um leve brilho de sombra na borda e no box-shadow ao receber `focus`.

### D. Badges / Tags
- Micro-badges nos menus e nos rodapés dos cards: `border: 1px solid rgba(...)`, fonte monoespaçada, tamanho minúsculo (0.65rem - 0.75rem), com ponto azul ao lado simulando status.

---

## 6. Regras de Acessibilidade e Performance
- **Sem Frameworks Pesados:** 100% HTML Semântico e Vanilla CSS.
- **Efeitos Suaves:** Usar transições leves (`transition: all 0.2s;`). Se o computador for antigo, usar media query `@media (prefers-reduced-motion: reduce)` para desligar transições.
- **Acessibilidade do Menu:** Textos recolhidos do Rail usam `opacity: 0` e `white-space: nowrap` ao invés de `display: none`. Isso garante que leitores de tela ainda consigam ler os links e navegar.
- **Responsividade:** Em telas `max-width: 768px`, a barra lateral (Rail) vira um menu off-canvas e a coluna secundária é escondida.

---

## 7. A Assinatura Visual Definitiva (O Padrão Ouro)
Para garantir que o resultado seja sempre superior a qualquer benchmark de mercado (incluindo o site da Impacta) e para que o usuário **nunca mais precise referenciar fontes externas**, todos os agentes devem seguir estes mandamentos visuais em TODAS as páginas (internas e externas):

### A. Fluxo e Respiro (Whitespace)
- **Zero Poluição Visual:** Nunca esprema elementos. As seções de conteúdo devem ter margens generosas e *paddings* imensos (ex: `padding: 80px 0`) para criar uma sensação de calma, foco e grandiosidade. 
- **Expansão Natural:** Textos, parágrafos e grids expandem de forma natural até o limite estrutural (ex: `max-width: 1000px`), sem se sentirem confinados em caixas ou *cards* desnecessários. O conteúdo deve respirar.

### B. Efeitos de "Magia" (Interações e Animações)
- **Revelação Suave (Scroll Reveals):** Elementos não apenas aparecem, eles "nascem" na tela. Usar transições de opacidade (`opacity: 0` para `1`) e leves translações no eixo Y (`transform: translateY(20px)` para `0`) acionadas de forma natural.
- **Micro-interações e Glows:** Cartões, links e botões respondem ao mouse flutuando sutilmente (`transform: translateY(-4px)`) e revelando *glows* (sombras radiantes coloridas, ex: `box-shadow` azul muito difuso) em vez de depender de bordas duras.
- **Progressive Enhancement:** **Toda essa magia deve ser implementada via CSS nativo.** Em navegadores ou celulares antigos (Realidade Brasileira), a animação é ignorada ou desativada suavemente (`prefers-reduced-motion`), mas a estrutura, as cores e o conteúdo carregam instantaneamente e sem quebras. 

### C. A Harmonia Tipográfica
- **Mix de Personalidade (O Charme):** Títulos principais sempre misturam o peso bruto de uma fonte Sans-Serif moderna com o charme elegante de uma fonte Serifada em Itálico (ex: `<span class="emphasis">itálico</span>`) para destacar palavras-chave vitais.
- **Ritmo de Leitura:** Parágrafos usam espaçamento confortável (`line-height: 1.8`) e cores acinzentadas (`text-muted`). A fonte principal de leitura deve ter legibilidade irretocável.

### D. Organização de Conteúdo (Sessões e Tags)
- **Quebras Discretas:** Alternar o fundo das grandes seções entre Branco Puro (`#FFFFFF`) e Cinza Super Leve (`#F8FAFC`) para dividir o conteúdo de forma invisível, sem usar linhas pretas duras.
- **Micro-Ícones e Tags Mono:** Informações auxiliares e categorias sempre usam etiquetas monoespaçadas (estilo código: `[ SKILLS • COWORK ]`) e ícones minimalistas envoltos em círculos suaves para guiar o olhar do usuário.

---
*(Base consolidada. Com este documento, eu (Gemini) e o Claude Code temos TODO o poder de processamento e criatividade engatilhados para gerar qualquer tela — da Home ao Checkout — com uma estética superior, impecável e 100% pronta para a realidade brasileira).*
