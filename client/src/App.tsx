import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { HomePage } from "@/pages/HomePage";
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
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cursos" element={<CatalogPage />} />
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
