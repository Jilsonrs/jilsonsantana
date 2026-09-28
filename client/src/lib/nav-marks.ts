import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { passosConcluidos } from "@/lib/course-steps";
import { casaRota, type Secao } from "@/lib/navigation";

/**
 * As `chave`s dos itens do nível 2 que ganham o ✓ de "completo" — vazio onde a
 * seção não declara `marcas`.
 *
 * Os passos do editor do curso leem a MESMA consulta que o editor já faz
 * (`["admin-course", id]`): o React Query junta as duas, então o ✓ não custa um
 * pedido a mais ao servidor, e acompanha o curso cada vez que um passo salva.
 */
export function useItensConcluidos(pathname: string, secao: Secao | undefined): ReadonlySet<string> {
  const params = secao?.marcas === "passos-do-curso" ? casaRota(pathname, secao.to) : null;
  const id = Number(params?.id);
  const ligado = Number.isInteger(id);
  const { data: curso } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: () => api.adminGetCourse(id),
    enabled: ligado,
  });
  return ligado && curso ? passosConcluidos(curso) : new Set();
}
