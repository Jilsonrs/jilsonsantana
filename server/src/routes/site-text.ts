import { Router } from "express";
import { LANGUAGES, type LanguageCode } from "@jilson/core";
import { getDict } from "../lib/dict.js";

const router = Router();

// Leitura PÚBLICA dos textos `common.*` (menu e rodapé), já com as edições do
// operador. É por aqui que o rodapé do app logado mostra os MESMOS textos do
// rodapé da home: editou uma vez em Admin → Textos, muda nos dois lugares
// (decisão do operador, 24/09/2026).
//
// Sai do `getDict()` — a mesma porta da home, com o mesmo cache —, nunca do
// dicionário importado direto, senão a edição do operador não chegaria aqui.
// Só `common`: os textos de cada página (`home.*`) não têm por que sair por API.
router.get("/site-text/common/:lang", async (req, res) => {
  const lang = req.params.lang;
  if (!(LANGUAGES as readonly string[]).includes(lang)) {
    res.status(400).json({ error: "InvalidLanguage" });
    return;
  }
  // Seguro: a linha acima provou que `lang` é um dos LANGUAGES.
  const dict = await getDict(lang as LanguageCode);
  res.json(dict.common);
});

export default router;
