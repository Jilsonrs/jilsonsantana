import { z } from "zod";

// Client-side login form validation. The server's credential check is Better
// Auth's; this only guards the form UX (shared so it stays one source of truth).
export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
