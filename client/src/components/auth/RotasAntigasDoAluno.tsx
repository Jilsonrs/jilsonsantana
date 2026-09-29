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

/**
 * OS ENDEREÇOS ANTIGOS DAS TELAS DO ALUNO (decisão do operador, 28/09/2026: as
 * telas passam para `/aluno/*`, e os antigos redirecionam). Mudou antes de
 * haver aluno real, mas o operador e a conta de teste têm esses links salvos.
 *
 * FORA do `ProtectedRoute` de propósito: quem não está logado é redirecionado
 * primeiro, e o login é pedido já no endereço novo.
 *
 * Exportado como rotas, e não escrito no `App.tsx`, para o teste montar
 * EXATAMENTE as mesmas que o app (mesmo padrão de `ROTAS_DO_EDITOR`).
 */
export const ROTAS_ANTIGAS_DO_ALUNO = (
  <>
    <Route path="/inicio" element={<ParaAreaDoAluno />} />
    <Route path="/conta/*" element={<ParaAreaDoAluno />} />
    <Route path="/minhas-trilhas/*" element={<ParaAreaDoAluno />} />
  </>
);
