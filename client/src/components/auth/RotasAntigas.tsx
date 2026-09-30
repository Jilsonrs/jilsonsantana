import { Navigate, Route, useLocation } from "react-router-dom";

/**
 * Leva o endereço antigo ao novo, sob `/aluno/`, mantendo o resto do caminho,
 * a busca e a âncora: `/conta/faturamento?x=1` → `/aluno/conta/faturamento?x=1`.
 *
 * `replace`: o endereço velho não fica no histórico — senão "voltar" cairia
 * nele e seria redirecionado de novo, prendendo o aluno na mesma tela.
 */
function ParaAreaDoAluno() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`/aluno${pathname}${search}${hash}`} replace />;
}

/** Leva a um endereço fixo, mantendo a busca e a âncora (mesmo `replace`). */
function Para({ destino }: { destino: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${destino}${search}${hash}`} replace />;
}

/**
 * OS ENDEREÇOS ANTIGOS, que redirecionam para os atuais:
 *
 * - `/conta` e `/minhas-trilhas` → sob `/aluno/` (decisão do operador,
 *   28/09/2026: as telas do aluno passam para `/aluno/*`).
 * - `/aluno/inicio` → `/inicio`, e `/admin` → `/dashboard` (decisão do operador,
 *   29/09/2026: a plataforma é uma só — o Início é `/inicio` para todos, e o
 *   painel do admin é o Dashboard). Os dois foram publicados no mesmo dia.
 *   `/admin` casa SÓ o endereço exato: `/admin/cursos` e o resto não mudam.
 *
 * FORA do `ProtectedRoute`/`AdminRoute` de propósito: quem não está logado é
 * redirecionado primeiro, e o login é pedido já no endereço novo.
 *
 * Exportado como rotas, e não escrito no `App.tsx`, para o teste montar
 * EXATAMENTE as mesmas que o app (mesmo padrão de `ROTAS_DO_EDITOR`).
 */
export const ROTAS_ANTIGAS = (
  <>
    <Route path="/conta/*" element={<ParaAreaDoAluno />} />
    <Route path="/minhas-trilhas/*" element={<ParaAreaDoAluno />} />
    <Route path="/aluno/inicio" element={<Para destino="/inicio" />} />
    <Route path="/admin" element={<Para destino="/dashboard" />} />
  </>
);
