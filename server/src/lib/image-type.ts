// Que imagem é esta, pelo CONTEÚDO — nunca pelo nome nem pelo cabeçalho que o
// navegador mandou, que qualquer um escreve. Aceita o que a escola usa:
// WebP (o padrão) e também JPG e PNG, sem conversão (decisão do operador,
// 27/09/2026). O resto é recusado, inclusive SVG, que pode carregar script.

export type TipoDeImagem = { extensao: "webp" | "jpg" | "png"; mime: string };

export function tipoDaImagem(b: Buffer): TipoDeImagem | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { extensao: "jpg", mime: "image/jpeg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((byte, i) => b[i] === byte)) {
    return { extensao: "png", mime: "image/png" };
  }
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    return { extensao: "webp", mime: "image/webp" };
  }
  return null;
}
