import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PlanModuleDetail, PlanItemDetail } from "@/lib/api";
import { useT } from "@/lib/language";

// Árvore PlanModule → PlanItem, compartilhada pela trilha CURADA (pública, por
// slug) e pela trilha SALVA do aluno (por id). São a MESMA entidade — só o dono
// difere (CLAUDE.md → Content Model & Trilhas) —, então a árvore é um componente
// só: uma segunda cópia divergiria na primeira mudança de layout.
//
// O heading da seção fica com a PÁGINA, não aqui: páginas compõem seções, e as
// duas telas dão nomes diferentes ao mesmo bloco.
export function PlanModuleAccordion({ planModules }: { planModules: PlanModuleDetail[] }) {
  const t = useT();
  // Vazio é estado real, não defeito: um módulo cujos itens todos apontam para
  // curso não publicado chega aqui sem itens (o filtro `publicadoNaCadeia` do
  // servidor), e uma trilha recém-criada no admin ainda não tem módulo nenhum.
  if (planModules.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.minhasTrilhas.semConteudo}</p>;
  }

  return (
    <Accordion type="multiple">
      {planModules.map((mod) => (
        <AccordionItem key={mod.id} value={String(mod.id)}>
          <AccordionTrigger>{mod.title}</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {mod.items.map((item) => (
                <li key={item.id}>
                  <PlanItemRow item={item} />
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function PlanItemRow({ item }: { item: PlanItemDetail }) {
  if (item.course) {
    return (
      <Link to={`/curso/${item.course.slug}`} className="text-sm text-primary hover:underline">
        {item.course.title}
      </Link>
    );
  }
  if (item.lesson) {
    return <span className="text-sm text-muted-foreground">{item.lesson.title}</span>;
  }
  return null;
}
