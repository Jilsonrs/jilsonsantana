import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPage } from "@/pages/AdminPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { TrilhaDetailPage } from "@/pages/TrilhaDetailPage";

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
          <Route path="/conta" element={<AccountPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
