// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useSessionMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSessionMock() }));

import { AdminRoute } from "./AdminRoute";

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>painel admin</div>} />
        </Route>
        <Route path="/conta" element={<div>minha conta</div>} />
        <Route path="/login" element={<div>tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminRoute", () => {
  beforeEach(() => useSessionMock.mockReset());

  it("redirects an authenticated non-admin to /conta", () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: "member" } },
      isPending: false,
    });
    renderAt();
    expect(screen.getByText("minha conta")).toBeTruthy();
    expect(screen.queryByText("painel admin")).toBeNull();
  });

  it("renders the admin content for an admin", () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: "admin" } },
      isPending: false,
    });
    renderAt();
    expect(screen.getByText("painel admin")).toBeTruthy();
  });

  it("redirects to /login with no session", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    renderAt();
    expect(screen.getByText("tela de login")).toBeTruthy();
  });
});
