// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseCard } from "@/lib/api";

const adminGetCourses = vi.fn();
const deleteCourse = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourses: (...args: unknown[]) => adminGetCourses(...args),
  deleteCourse: (...args: unknown[]) => deleteCourse(...args),
}));

import { AdminCoursesPage } from "./AdminCoursesPage";

const course: AdminCourseCard = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  status: "DRAFT",
  displayOrder: 0,
  moduleCount: 2,
  lessonCount: 3,
};

beforeEach(() => {
  adminGetCourses.mockReset().mockResolvedValue([course]);
  deleteCourse.mockReset().mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("AdminCoursesPage", () => {
  it("renders every course regardless of status, with an edit link", async () => {
    renderWithProviders(<AdminCoursesPage />);

    expect(await screen.findByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
    expect(screen.getByText("DRAFT")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Editar" }).getAttribute("href")).toBe(
      "/admin/cursos/1",
    );
  });

  it("deletes a course after confirmation", async () => {
    renderWithProviders(<AdminCoursesPage />);
    await screen.findByText("Exemplo — Fundamentos de Excel + IA");

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    // TanStack Query v5's mutationFn is invoked with a second internal
    // context argument — assert on the actual variable passed, not an exact
    // arg-count match.
    await waitFor(() => expect(deleteCourse.mock.calls[0]?.[0]).toBe(1));
  });
});
