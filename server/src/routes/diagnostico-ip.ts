import { Router } from "express";

const diagnosticoIpRouter = Router();

// Rota temporária de diagnóstico do IP (Bloco G, etapa G4):
// devolve APENAS os cabeçalhos de endereço recebidos na borda,
// sem cookies, sem query e sem dados sensíveis.
diagnosticoIpRouter.get("/diagnostico-ip", (req, res) => {
  res.json({
    "x-forwarded-for": req.headers["x-forwarded-for"] ?? null,
    "x-real-ip": req.headers["x-real-ip"] ?? null,
    forwarded: req.headers["forwarded"] ?? null,
  });
});

export default diagnosticoIpRouter;
