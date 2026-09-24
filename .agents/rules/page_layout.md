# Padrão de Layout (Área Logada / Dashboard)

Este projeto utiliza um padrão de interface de usuário rigoroso para **todas as páginas da ÁREA LOGADA da aplicação** (tanto no painel administrativo `/admin`, quanto nas telas do painel do aluno `/inicio`, `/conta`, `/minhas-trilhas`, etc).

**As páginas públicas NÃO usam estes componentes do dashboard.** A home (`/` e `/en`) é HTML montado no servidor, com padrão próprio de vitrine. O catálogo (`/cursos`, `/trilhas`) e as páginas de detalhe (`/curso/:slug`, `/trilha/:slug`) seguem o mesmo destino, mas **hoje ainda são React provisório e usam `PageContainer`**. Isso fica até serem trocadas pelo template de servidor (Bloco C5). Não invista acabamento nelas.

**NUNCA utilize formulários centralizados tradicionais soltos, layouts estreitos (`max-w-md`) ou larguras inconsistentes DENTRO do dashboard. Toda página logada principal deve seguir o sistema de Layout Base.**

## Os Três Componentes Base

Toda nova página no sistema deve ser construída importando e utilizando os componentes base encontrados em `client/src/components/layout/PageLayout.tsx`:

1. `PageContainer`: Mantém o layout alinhado à esquerda com um "gutter" exato de **50px** da barra lateral em telas grandes (`px-[50px]`), expandindo a largura útil e garantindo consistência absoluta entre telas. É altamente responsivo (usando `px-4` e `py-6` no mobile para economizar espaço).
2. `PageHeader`: Cabeçalho fixo (sticky). Usa margens negativas automáticas para encostar nas bordas definidas pelo `PageContainer`.
3. `PageSection`: Padrão Empilhado (Stacked Layout). Título e descrição ficam sempre no topo, e o conteúdo (formulário, dados, cards) ocupa a área completa logo abaixo. Isso evita espremimento de campos em monitores e mantém a ordem de leitura (título -> ação) universal para qualquer dispositivo.

### Exemplo de Estrutura (Página de Formulário/Dados)

```tsx
import {
  PageContainer,
  PageHeader,
  PageSection,
} from "@/components/layout/PageLayout";

export function MinhaNovaPagina() {
  return (
    <PageContainer>
      <PageHeader 
        title="Título da Página" 
        description="Subtítulo explicativo."
        actions={<Button>Ação Principal</Button>}
      />

      <div className="space-y-12">
        <PageSection
          title="Informações Básicas"
          description="Explicação amigável do que esta seção faz, com dicas."
        >
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Seus campos (Inputs, Textareas, etc) vão aqui. Eles ocuparão 100% da largura *do Card*, o que é perfeitamente balanceado. */}
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageContainer>
  );
}
```

## Diretrizes de UI/UX
- **Alinhamento e Largura (Gutter de 50px):** Diferente de páginas de artigo que centralizam o texto, este é um "espaço de trabalho". O `PageContainer` não centraliza os cards (embora possua um mx-auto protetor apenas para monitores Ultrawide gigantes); ele âncora à esquerda respeitando os exatos `50px` de distância da barra lateral em telas Desktop. Isso gera fluidez sem "pulo" no conteúdo ao trocar de abas na barra lateral.
- **Economia Mobile:** No mobile, os `PageContainer` e `PageHeader` se ajustam para margens muito curtas (`px-4`) e fontes menores para garantir que as tabelas e grids caibam perfeitamente. NUNCA aplique paddings extras (`p-6` ou `px-8`) nas divs wrapper dentro do `PageContainer` em mobile, senão o espaço útil sumirá.
- **Sticky Header e Botões de Salvar:** Ações globais da página (como navegação) podem ficar no `actions` do `PageHeader`. **Cuidado:** Se a página tiver seções com salvamento automático/independente abaixo do formulário principal, evite colocar um botão "Salvar Tudo" fixo no topo, pois os usuários podem achar que ele salva as seções inferiores. Nesses casos, coloque o botão de "Salvar" no final do próprio formulário (antes das listas independentes).
- **Mídia Visual:** Se a tela envolve imagens ou vídeos, SEMPRE construa um layout rico (com um div `aspect-video bg-muted` para o preview) ao lado do input, e não apenas um campo de texto puro.
- **Apresentação de Dados (Read-only):** Em páginas de configuração ou conta onde há listagem de dados simples (rótulo e valor), limite a largura do `Card` (ex: `max-w-3xl`) para que os campos não estiquem por toda a tela, e alinhe os valores próximos aos rótulos à esquerda usando um grid com colunas ajustadas (ex: `grid-cols-[auto_1fr] gap-2.5`).
