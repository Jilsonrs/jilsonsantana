import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { LoginPage } from "@/pages/LoginPage";
import { StudentHomePage } from "@/pages/StudentHomePage";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPage } from "@/pages/AdminPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { TrilhaDetailPage } from "@/pages/TrilhaDetailPage";
import { MyTrilhasPage } from "@/pages/MyTrilhasPage";
import { MyTrilhaDetailPage } from "@/pages/MyTrilhaDetailPage";
import { LessonPage } from "@/pages/aluno/LessonPage";
import { CourseEntryPage } from "@/pages/aluno/CourseEntryPage";
import { EmAndamentoPage } from "@/pages/aluno/EmAndamentoPage";
import { SalvosPage } from "@/pages/aluno/SalvosPage";
import { NotificacoesPage } from "@/pages/aluno/NotificacoesPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { NewCoursePage } from "@/pages/admin/course-editor/NewCoursePage";
import { CourseEditorLayout } from "@/pages/admin/course-editor/CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "@/pages/admin/course-editor/steps";
import { AdminSiteTextPage } from "@/pages/admin/AdminSiteTextPage";
import { AdminTestimonialsPage } from "@/pages/admin/AdminTestimonialsPage";
import { AdminFaqPage } from "@/pages/admin/AdminFaqPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* NÃO existe rota "/" aqui, e é de propósito: a raiz é a home PÚBLICA,
            servida pelo Express. Em produção ele responde antes de o React
            existir; em dev o proxy do Vite manda a raiz para ele (vite.config.ts).
            Declarar "/" no React criaria uma segunda home que ninguém alcança —
            foi o que aconteceu com a antiga HomePage.tsx, apagada em set/2026. */}
        <Route path="/login" element={<LoginPage />} />
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
          <Route path="/aluno/minhas-trilhas" element={<MyTrilhasPage />} />
          <Route path="/aluno/minhas-trilhas/:id" element={<MyTrilhaDetailPage />} />
          <Route path="/aluno/conta" element={<AccountPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          {/* O painel do admin (decisão do operador, 29/09/2026). */}
          <Route path="/dashboard" element={<AdminPage />} />
          <Route path="/admin/cursos" element={<AdminCoursesPage />} />
          <Route path="/admin/cursos/novo" element={<NewCoursePage />} />
          {/* O editor em 7 passos (Bloco E, 28/09/2026): cada passo é uma rota
              filha, e o nível 2 da navegação os lista (lib/navigation.ts). */}
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
        </Route>
      </Route>
    </Routes>
  );
}
