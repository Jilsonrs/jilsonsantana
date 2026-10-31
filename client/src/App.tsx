import { Routes, Route, Navigate } from "react-router";
import { TELA_PRECISA_DE_ATENDENTE } from "@jilson/core";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { LoginPage } from "@/pages/LoginPage";
import { EsqueciMinhaSenhaPage } from "@/pages/EsqueciMinhaSenhaPage";
import { StudentHomePage } from "@/pages/StudentHomePage";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPage } from "@/pages/AdminPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { TrilhaDetailPage } from "@/pages/TrilhaDetailPage";
import { MyTrilhasPage } from "@/pages/MyTrilhasPage";
import { MyTrilhaDetailPage } from "@/pages/MyTrilhaDetailPage";
import { LessonPage } from "@/pages/aluno/LessonPage";
import { CoursePreviewPage } from "@/pages/admin/CoursePreviewPage";
import { CourseEntryPage } from "@/pages/aluno/CourseEntryPage";
import { EmAndamentoPage } from "@/pages/aluno/EmAndamentoPage";
import { SalvosPage } from "@/pages/aluno/SalvosPage";
import { NotificacoesPage } from "@/pages/aluno/NotificacoesPage";
import { NotificacaoPage } from "@/pages/aluno/NotificacaoPage";
import { AssinarPage } from "@/pages/aluno/AssinarPage";
import { AssinarSemLoginPage } from "@/pages/AssinarSemLoginPage";
import { AssinaturaConcluidaSemLoginPage } from "@/pages/AssinaturaConcluidaSemLoginPage";
import { ProtecaoDoApp } from "@/components/ErroDaTela";
import { AssinaturaConcluidaPage } from "@/pages/aluno/AssinaturaConcluidaPage";
import { FaturamentoPage } from "@/pages/aluno/FaturamentoPage";
import { TrocarCartaoPage } from "@/pages/aluno/TrocarCartaoPage";
import { PagarComPixPage } from "@/pages/aluno/PagarComPixPage";
import { CancelarPage } from "@/pages/aluno/CancelarPage";
import { MudarDePlanoPage } from "@/pages/aluno/MudarDePlanoPage";
import { ReciboPage } from "@/pages/aluno/ReciboPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { NewCoursePage } from "@/pages/admin/course-editor/NewCoursePage";
import { CourseEditorLayout } from "@/pages/admin/course-editor/CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "@/pages/admin/course-editor/steps";
import { AdminSiteTextPage } from "@/pages/admin/AdminSiteTextPage";
import { AdminTestimonialsPage } from "@/pages/admin/AdminTestimonialsPage";
import { AdminFaqPage } from "@/pages/admin/AdminFaqPage";
import { CobrancaAssinaturasPage } from "@/pages/admin/cobranca/CobrancaAssinaturasPage";
import { CobrancaFichaPage } from "@/pages/admin/cobranca/CobrancaFichaPage";
import { CobrancaTentativasPage } from "@/pages/admin/cobranca/CobrancaTentativasPage";
import { CobrancaOQueAconteceuPage } from "@/pages/admin/cobranca/CobrancaOQueAconteceuPage";
import { CobrancaPrecisaDeVocePage } from "@/pages/admin/cobranca/CobrancaPrecisaDeVocePage";
import { CobrancaCodigosPage } from "@/pages/admin/cobranca/CobrancaCodigosPage";
import { AvisosPage } from "@/pages/admin/comunicacao/AvisosPage";
import { AvisoEditorPage } from "@/pages/admin/comunicacao/AvisoEditorPage";
import { MensagensAutomaticasPage } from "@/pages/admin/comunicacao/MensagensAutomaticasPage";

export default function App() {
  return (
    <Routes>
      {/* A TELA PÚBLICA DE ASSINAR (etapa 4.7, passo 6c): o app montado no MEIO de uma página do
          servidor, que já traz o menu e o rodapé do site — por isso FORA do Layout. Só o visitante
          chega aqui: o servidor leva quem está logado a /aluno/assinar. */}
      <Route
        path="/assinar"
        element={
          <ProtecaoDoApp>
            <AssinarSemLoginPage />
          </ProtecaoDoApp>
        }
      />
      {/* Depois do pagamento, sem conta (passo 6e2): também página do servidor com o app no meio. */}
      <Route
        path="/assinar/concluido"
        element={
          <ProtecaoDoApp>
            <AssinaturaConcluidaSemLoginPage />
          </ProtecaoDoApp>
        }
      />
      {/* O RECIBO DA ESCOLA (etapa 4.7b, passo 6a — decisão do operador, 31/10/2026): FORA do Layout, para imprimir só
          o recibo, sem o menu do app. Só com login: as cobranças são as da conta da sessão. */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/aluno/conta/faturamento/recibo/:chave"
          element={
            <ProtecaoDoApp>
              <ReciboPage />
            </ProtecaoDoApp>
          }
        />
      </Route>
      <Route element={<Layout />}>
        {/* NÃO existe rota "/" aqui, e é de propósito: a raiz é a home PÚBLICA,
            servida pelo Express. Em produção ele responde antes de o React
            existir; em dev o proxy do Vite manda a raiz para ele (vite.config.ts).
            Declarar "/" no React criaria uma segunda home que ninguém alcança —
            foi o que aconteceu com a antiga HomePage.tsx, apagada em set/2026. */}
        <Route path="/login" element={<LoginPage />} />
        {/* "Esqueci minha senha" — o código no e-mail e a senha nova (etapa 4.7, passo 5). */}
        <Route path="/esqueci-minha-senha" element={<EsqueciMinhaSenhaPage />} />
        <Route path="/cursos" element={<CatalogPage tipo="cursos" />} />
        <Route path="/trilhas" element={<CatalogPage tipo="trilhas" />} />
        <Route path="/curso/:slug" element={<CourseDetailPage />} />
        <Route path="/trilha/:slug" element={<TrilhaDetailPage />} />
        {/* A PÁGINA DA AULA (etapa 4 do Bloco U, 29/09/2026): a primeira tela nova
            já sob /aluno/. FORA do ProtectedRoute de propósito: a prévia grátis
            toca para visitante sem login. Quem decide o que cada um vê é o servidor. */}
        <Route path="/aluno/aula/:id" element={<LessonPage />} />
        {/* A entrada do aluno num curso: vai para a primeira aula (29/09/2026). */}
        <Route path="/aluno/curso/:slug" element={<CourseEntryPage />} />
        <Route element={<ProtectedRoute />}>
          {/* O Início é UM SÓ, para o aluno e para o admin, que testa por ele
              tudo o que o aluno faz (decisão do operador, 29/09/2026). */}
          <Route path="/inicio" element={<StudentHomePage />} />
          {/* Meus estudos abre aqui (decisão do operador, 29/09/2026). */}
          <Route path="/aluno/em-andamento" element={<EmAndamentoPage />} />
          <Route path="/aluno/salvos" element={<SalvosPage />} />
          <Route path="/aluno/notificacoes" element={<NotificacoesPage />} />
          {/* Uma notificação, completa (operador, 06/10/2026): da lista ou do sino. */}
          <Route path="/aluno/notificacoes/:id" element={<NotificacaoPage />} />
          <Route path="/aluno/minhas-trilhas" element={<MyTrilhasPage />} />
          <Route path="/aluno/minhas-trilhas/:id" element={<MyTrilhaDetailPage />} />
          <Route path="/aluno/conta" element={<AccountPage />} />
          {/* Faturamento e Assinatura (Fase 4, etapa 4.6): o item já estava no menu da
              conta, sem tela — o lugar é decisão do operador, 11/10/2026. */}
          <Route path="/aluno/conta/faturamento" element={<FaturamentoPage />} />
          {/* Cada ação tem a sua tela, com endereço próprio (decisão do operador, 11/10/2026). */}
          <Route path="/aluno/conta/faturamento/cartao" element={<TrocarCartaoPage />} />
          <Route path="/aluno/conta/faturamento/cancelar" element={<CancelarPage />} />
          <Route path="/aluno/conta/faturamento/plano" element={<MudarDePlanoPage />} />
          {/* Pagar com Pix a cobrança atrasada (4.9b, E14 — o endereço aprovado pelo operador, 30/10/2026). */}
          <Route path="/aluno/pagar-com-pix" element={<PagarComPixPage />} />
          {/* Assinar, com a conta logada (Fase 4, etapa 4.2; endereço decidido pelo
              operador em 10/10/2026). O /assinar curto fica para o visitante (4.7). */}
          <Route path="/aluno/assinar" element={<AssinarPage />} />
          <Route path="/aluno/assinar/concluido" element={<AssinaturaConcluidaPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          {/* O painel do admin (decisão do operador, 29/09/2026). */}
          <Route path="/dashboard" element={<AdminPage />} />
          <Route path="/admin/cursos" element={<AdminCoursesPage />} />
          <Route path="/admin/cursos/novo" element={<NewCoursePage />} />
          {/* O editor em 7 passos (Bloco E, 28/09/2026): cada passo é uma rota
              filha, e o nível 2 da navegação os lista (lib/navigation.ts). */}
          {/* Visualizar como aluno (passo Publicar, 04/10/2026): fora do editor,
              para abrir a tela do aluno e não os passos. */}
          <Route path="/admin/cursos/:id/previa" element={<CoursePreviewPage />} />
          <Route path="/admin/cursos/:id" element={<CourseEditorLayout />}>
            {ROTAS_DO_EDITOR}
          </Route>
          {/* "Site" tem 2º nível (Textos · Depoimentos · Perguntas frequentes). O
              link do menu continua sendo /admin/site, que leva a Textos. Textos
              ganhou endereço PRÓPRIO porque a coluna secundária acende um item
              também nas sub-rotas dele: em /admin/site ele ficaria aceso junto
              com Depoimentos. */}
          <Route path="/admin/site" element={<Navigate to="/admin/site/textos" replace />} />
          <Route path="/admin/site/textos" element={<AdminSiteTextPage />} />
          <Route path="/admin/site/depoimentos" element={<AdminTestimonialsPage />} />
          <Route path="/admin/site/faq" element={<AdminFaqPage />} />
          {/* COMUNICAÇÃO (bloco C1 — decisões do operador, 06/10/2026). O link do menu
              é /admin/comunicacao, que leva a Notificações (como "Site" leva a Textos). */}
          <Route path="/admin/comunicacao" element={<Navigate to="/admin/comunicacao/notificacoes" replace />} />
          <Route path="/admin/comunicacao/notificacoes" element={<AvisosPage />} />
          <Route path="/admin/comunicacao/notificacoes/nova" element={<AvisoEditorPage />} />
          <Route path="/admin/comunicacao/notificacoes/:id" element={<AvisoEditorPage />} />
          <Route path="/admin/comunicacao/mensagens-automaticas" element={<MensagensAutomaticasPage />} />
          {/* FINANCEIRO → RECEITA (o painel da cobrança, etapa 4.7b — o nome e o submenu decididos pelo operador,
              31/10/2026). O link do menu é /admin/financeiro, que leva à primeira tela: "Precisa de atendente" (passo 2c). */}
          <Route path="/admin/financeiro" element={<Navigate to={TELA_PRECISA_DE_ATENDENTE} replace />} />
          <Route path={TELA_PRECISA_DE_ATENDENTE} element={<CobrancaPrecisaDeVocePage />} />
          <Route path="/admin/financeiro/receita/assinaturas" element={<CobrancaAssinaturasPage />} />
          {/* A ficha do aluno (passo 1d): debaixo de "Assinaturas", que fica aceso no submenu. */}
          <Route path="/admin/financeiro/receita/assinaturas/ficha" element={<CobrancaFichaPage />} />
          <Route path="/admin/financeiro/receita/tentativas" element={<CobrancaTentativasPage />} />
          <Route path="/admin/financeiro/receita/o-que-aconteceu" element={<CobrancaOQueAconteceuPage />} />
          <Route path="/admin/financeiro/receita/codigos" element={<CobrancaCodigosPage />} />
        </Route>
        {/* Endereço que não existe no app — um favorito antigo de /conta, um
            endereço digitado errado — leva ao Início (decisão do operador,
            06/10/2026, P44); antes, a página ficava em branco. Quem não entrou
            segue do Início para o login, como em qualquer tela protegida. */}
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Route>
    </Routes>
  );
}
