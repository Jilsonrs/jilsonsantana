// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false }),
  signIn: { email: vi.fn() },
}));

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders the email + password fields and submit button", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("E-mail")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeTruthy();
  });
});
