import type { Language } from "@prisma/client";
import type { LanguageCode } from "@jilson/core";

// A API fala "pt"/"en" (o mesmo código do endereço e do dicionário); o banco
// guarda o enum do Prisma, PT/EN. A conversão mora aqui para as rotas nunca
// compararem as duas grafias à mão.
export const paraBanco = (l: LanguageCode): Language => (l === "pt" ? "PT" : "EN");
export const doBanco = (l: Language): LanguageCode => (l === "PT" ? "pt" : "en");
