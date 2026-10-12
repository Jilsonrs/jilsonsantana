/**
 * "1,4 MB", "820 KB": o tamanho de um arquivo para gente ler — no admin (o
 * operador confere o que enviou) e na página da aula (o aluno vê o que vai
 * baixar).
 */
export function tamanhoLegivel(bytes: number): string {
  const local = "pt-BR";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString(local, { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(local)} KB`;
}
