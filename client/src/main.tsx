import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { captureUtmOnce } from "@/lib/attribution";
import { recarregarUmaVez } from "@/lib/recarregar";
import { desviarLinksQuandoHouverVersaoNova, PEDACOS_DO_ALUNO, preCarregarPedacos } from "@/lib/versao";

// Capture first-touch UTM attribution before the app renders (P1 seam; the
// value is persisted to the User at checkout in P4).
captureUtmOnce();

// O site foi atualizado com a tela aberta: um pedaço do app de antes não existe
// mais. O Vite avisa (`vite:preloadError`), e a página recarrega na versão nova —
// uma vez; se já recarregou há pouco, o erro segue para a tela de erro (05/10/2026).
window.addEventListener("vite:preloadError", (evento) => {
  if (recarregarUmaVez()) evento.preventDefault();
});

// Atualizar o site sem atrapalhar quem está estudando (decisão do operador,
// 06/10/2026): com versão nova no servidor, o próximo clique num link carrega a
// página inteira, já atualizada; e o que a aula usa sob demanda é baixado logo,
// em segundo plano, para uma aba aberta não depender de arquivo que vai mudar.
desviarLinksQuandoHouverVersaoNova();
preCarregarPedacos(PEDACOS_DO_ALUNO);

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
