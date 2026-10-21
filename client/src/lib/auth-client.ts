import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

// Same-origin by design: in dev the Vite proxy forwards /api -> :3000; in prod
// the client is served by Express on the same origin. So baseURL defaults to the
// current origin and Better Auth routes resolve to /api/auth/*.
export const authClient = createAuthClient({
  plugins: [
    // Surfaces our custom additionalFields (notably `role`) on the typed
    // session user — without importing the server's auth type into the client.
    inferAdditionalFields({
      user: {
        role: { type: "string" },
      },
    }),
    // O CÓDIGO NO E-MAIL (etapa 4.7, passo 5): entrar com o código (`signIn.emailOtp`) e criar a
    // senha nova com ele (`emailOtp.resetPassword`). PEDIR o código é pela nossa rota
    // (`pedirCodigo`, em `lib/api.ts`), que tem os limites — as do Better Auth estão desligadas.
    emailOTPClient(),
  ],
});

export const { signIn, signOut, useSession, emailOtp } = authClient;
