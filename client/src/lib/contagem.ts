/**
 * "1 módulo", "2 módulos", "0 aulas" — o número com a palavra no singular só
 * quando é exatamente 1 (revisão do inglês, 24/09/2026). Zero fica no plural nos
 * dois idiomas: "0 aulas" / "0 lessons", como o operador decidiu para curso sem aula.
 */
export function contagem(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
