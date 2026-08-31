import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { captureUtmOnce } from "@/lib/attribution";

// Capture first-touch UTM attribution before the app renders (P1 seam; the
// value is persisted to the User at checkout in P4).
captureUtmOnce();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx (404 on a bad slug, 400 on a too-short search) will never
      // succeed on retry — without this, every not-found page state (Bloco 5
      // CourseDetailPage/TrilhaDetailPage) sits on "Carregando…" for ~10s
      // while React Query's default 3 retries + backoff burn through.
      retry: (failureCount, error) =>
        isAxiosError(error) && error.response && error.response.status < 500
          ? false
          : failureCount < 3,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
