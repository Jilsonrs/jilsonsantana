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
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { AdminCourseFormPage } from "@/pages/admin/AdminCourseFormPage";
import { AdminSiteTextPage } from "@/pages/admin/AdminSiteTextPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* A home pública é HTML de servidor (server/src/views/home.ts) — em
            produção o Express responde "/" antes de o React existir, então esta
            rota NUNCA é alcançada lá. Ela sobrevive só para o desenvolvimento:
            quem abre localhost:5173/ cai no app em vez de numa tela em branco.
            A antiga HomePage.tsx (landing mínima em React) foi apagada em
            set/2026 — estava morta desde que a home de servidor entrou no ar. */}
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cursos" element={<CatalogPage tipo="cursos" />} />
        <Route path="/trilhas" element={<CatalogPage tipo="trilhas" />} />
        <Route path="/curso/:slug" element={<CourseDetailPage />} />
        <Route path="/trilha/:slug" element={<TrilhaDetailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/inicio" element={<StudentHomePage />} />
          <Route path="/minhas-trilhas" element={<MyTrilhasPage />} />
          <Route path="/minhas-trilhas/:id" element={<MyTrilhaDetailPage />} />
          <Route path="/conta" element={<AccountPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/cursos" element={<AdminCoursesPage />} />
          <Route path="/admin/cursos/novo" element={<AdminCourseFormPage />} />
          <Route path="/admin/cursos/:id" element={<AdminCourseFormPage />} />
          <Route path="/admin/site" element={<AdminSiteTextPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
