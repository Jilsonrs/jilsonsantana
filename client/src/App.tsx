import { Routes, Route } from "react-router-dom";
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
