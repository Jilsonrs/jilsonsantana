import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

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
  ],
});

export const { signIn, signOut, useSession } = authClient;
