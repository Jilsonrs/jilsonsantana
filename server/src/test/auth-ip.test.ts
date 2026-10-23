import { describe, it, expect } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { auth } from "../lib/auth.js";
import { CABECALHO_DO_IP, ipDoPedido } from "../lib/limite-de-tentativas.js";

// GUARDA DE CONFIGURAÇÃO E DO PORTEIRO DO IP (Bloco G, etapa G2 — regra provisória até a medição
// em produção na G4). O comportamento do rate-limit de login em si é provado em `login-limite.test.ts`;
// aqui conferimos a configuração do Better Auth, a regra de `ipDoPedido` contra cabeçalho forjado e
// o desvio 301 do domínio sem "www" (`jilsonsantana.com` → `https://www.jilsonsantana.com`).
describe("rate-limit do login — de onde vem o IP", () => {
  it("lê SÓ o x-forwarded-for (CABECALHO_DO_IP), já filtrado por ipDoPedido", () => {
    expect(CABECALHO_DO_IP).toBe("x-forwarded-for");
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual(["x-forwarded-for"]);
  });

  it("nunca confia num cabeçalho que o visitante consegue escrever sem passar pela frente do Cloud Run", () => {
    const cabecalhos = auth.options.advanced?.ipAddress?.ipAddressHeaders ?? [];
    for (const perigoso of ["fastly-client-ip", "true-client-ip", "cf-connecting-ip", "x-real-ip"]) {
      expect(cabecalhos).not.toContain(perigoso);
    }
  });

  it("ipDoPedido pega o ÚLTIMO endereço do x-forwarded-for (o acrescentado pela frente) e ignora valores forjados antes dele", () => {
    expect(ipDoPedido("203.0.113.10")).toBe("203.0.113.10");
    expect(ipDoPedido("198.51.100.1, 203.0.113.10")).toBe("203.0.113.10");
    expect(ipDoPedido("forjado, 198.51.100.1, 198.51.100.2, 203.0.113.10")).toBe("203.0.113.10");
    expect(ipDoPedido("198.51.100.1, 2001:db8:1:2::1")).toBe("2001:db8:1:2::1");
    // Se o último item não for um IP válido, devolve null — nunca recua para um item anterior (que seria do visitante).
    expect(ipDoPedido("203.0.113.10, nao-e-ip")).toBeNull();
    expect(ipDoPedido("203.0.113.10, ")).toBeNull();
    expect(ipDoPedido("abc")).toBeNull();
    expect(ipDoPedido("")).toBeNull();
    expect(ipDoPedido(undefined)).toBeNull();
    expect(ipDoPedido(null)).toBeNull();
  });

  it("ipDoPedido recusa endereço que não é de visitante no fim da lista (rede privada, a própria máquina, as faixas internas do Google) — vira 'sem IP', que alerta, em vez de juntar todos numa contagem", () => {
    for (const interno of [
      "10.1.2.3", "172.16.0.9", "192.168.1.1", "100.64.0.1", "127.0.0.1", "169.254.169.254",
      "35.191.10.20", "130.211.0.5", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1",
    ]) {
      expect(ipDoPedido(`203.0.113.10, ${interno}`), interno).toBeNull();
    }
    // A faixa interna do Google é 35.191.0.0/16 e 130.211.0.0/22 — o vizinho de fora continua valendo.
    expect(ipDoPedido("35.192.0.1")).toBe("35.192.0.1");
    expect(ipDoPedido("130.211.4.1")).toBe("130.211.4.1");
  });
});

describe("domínio sem www (jilsonsantana.com → https://www.jilsonsantana.com)", () => {
  it("desvia jilsonsantana.com exato com 301 preservando o caminho e a query string", async () => {
    const raiz = await request(servidor).get("/").set("Host", "jilsonsantana.com");
    expect(raiz.status).toBe(301);
    expect(raiz.headers.location).toBe("https://www.jilsonsantana.com/");

    const comCaminho = await request(servidor).get("/cursos/excel?utm_source=youtube&utm_campaign=lancamento").set("Host", "JilsonSantana.com:443");
    expect(comCaminho.status).toBe(301);
    expect(comCaminho.headers.location).toBe("https://www.jilsonsantana.com/cursos/excel?utm_source=youtube&utm_campaign=lancamento");
  });

  it("NÃO desvia www.jilsonsantana.com nem o endereço provisório *.run.app", async () => {
    const www = await request(servidor).get("/api/health").set("Host", "www.jilsonsantana.com");
    expect(www.status).toBe(200);

    const runApp = await request(servidor).get("/api/health").set("Host", "jilsonsantana-123456-uk.a.run.app");
    expect(runApp.status).toBe(200);
  });
});
