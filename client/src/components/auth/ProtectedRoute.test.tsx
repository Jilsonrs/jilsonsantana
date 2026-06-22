// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useSessionMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSessionMock() }));

import { ProtectedRoute } from "./ProtectedRoute";

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/conta"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/conta" element={<div>conta privada</div>} />
        </Route>
        <Route path="/login" element={<div>tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => useSessionMock.mockReset());

  it("redirects to /login when there is no session", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    renderAt();
    expect(screen.getByText("tela de login")).toBeTruthy();
    expect(screen.queryByText("conta privada")).toBeNull();
  });

  it("renders the protected content when authenticated", () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: "member" } },
      isPending: false,
    });
    renderAt();
    expect(screen.getByText("conta privada")).toBeTruthy();
  });
});
