import { Router } from "express";
import { flattenDict, pt, siteTextUpdateSchema, DICT_KEYS } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { invalidarCacheDeTexto } from "../lib/dict.js";

const router = Router();

// Texto de página editável pelo operador. Tudo aqui é admin-only: é a tela que
// muda o que o visitante lê. Ver docs/content.md § 16.

// GET /api/admin/site-text — todo campo editável, com o valor de fábrica ao
// lado do atual. Sai do DICIONÁRIO, não do banco: a lista de campos é o
// código, e o banco só diz o que foi mudado. Um campo nunca editado aparece
// igual — é isso que faz a tela não ter "estado vazio" de verdade.
router.get("/admin/site-text", requireAdmin, async (_req, res) => {
  const sobrescritas = await prisma.siteText.findMany({ select: { key: true, value: true } });
  const porChave = new Map(sobrescritas.map((s) => [s.key, s.value]));

  // Só o editável: o texto do app (`app.*`) não aparece aqui (DICT_KEYS).
  const campos = flattenDict(pt)
    .filter(([key]) => DICT_KEYS.has(key))
    .map(([key, valorPt]) => ({
      key,
      // A seção é derivada do caminho ("home.pricing.features[0]" → "home.pricing"), nunca
      // uma coluna: um agrupamento gravado envelhece quando a chave se move.
      section: key.split(/[.[]/).slice(0, 2).join("."),
      // O formato `pt: {...}` é o que a tela lê desde o começo; fica.
      pt: { factory: valorPt, override: porChave.get(key) ?? null },
    }));

  res.json({ campos });
});

// PUT /api/admin/site-text — grava uma sobrescrita.
//
// Valor VAZIO apaga a linha em vez de gravar string vazia: é assim que o
// operador desfaz uma edição sem ter que lembrar o texto original. Gravar ""
// deixaria a tela em branco, que é o oposto do que "limpar o campo" sugere.
router.put("/admin/site-text", requireAdmin, async (req, res) => {
  const body = validate(siteTextUpdateSchema, req.body, res);
  if (body === null) return;

  const valor = body.value.trim();

  if (valor === "") {
    await prisma.siteText.deleteMany({ where: { key: body.key } });
  } else {
    await prisma.siteText.upsert({
      where: { key: body.key },
      create: { key: body.key, value: valor },
      update: { value: valor },
    });
  }

  invalidarCacheDeTexto();
  res.json({ key: body.key, value: valor, usandoFabrica: valor === "" });
});

export default router;
