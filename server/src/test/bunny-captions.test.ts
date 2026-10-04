import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apagarLegenda, enviarLegenda, limparCacheDaLegenda } from "../lib/bunny-stream.js";

// O FORMATO que o site manda ao Bunny para a legenda — conferido na referência
// oficial da API do Stream em 04/10/2026 ("Add Caption" e "Delete Caption"). A
// rede vira dublê: o teste lê o pedido que sairia.
const ENV = ["BUNNY_STREAM_LESSONS_LIBRARY_ID", "BUNNY_STREAM_LESSONS_API_KEY"] as const;
const antes = Object.fromEntries(ENV.map((n) => [n, process.env[n]]));
const fetchFalso = vi.fn();

beforeEach(() => {
  process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
  process.env.BUNNY_STREAM_LESSONS_API_KEY = "chave-de-teste";
  fetchFalso.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const n of ENV) {
    if (antes[n] === undefined) delete process.env[n];
    else process.env[n] = antes[n];
  }
});

describe("enviarLegenda", () => {
  it("POST no vídeo, no idioma, com o arquivo em base64 e a chave no cabeçalho", async () => {
    const vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nOlá — ação.\n";

    expect(await enviarLegenda("vid-1", "pt", "Português", vtt)).toBe(true);

    const [url, pedido] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://video.bunnycdn.com/library/762605/videos/vid-1/captions/pt");
    expect(pedido.method).toBe("POST");
    expect((pedido.headers as Record<string, string>).AccessKey).toBe("chave-de-teste");
    const corpo = JSON.parse(pedido.body as string) as { label: string; captionsFile: string };
    expect(corpo.label).toBe("Português");
    expect(Buffer.from(corpo.captionsFile, "base64").toString("utf8")).toBe(vtt);
  });

  it("o Bunny recusou: false", async () => {
    fetchFalso.mockResolvedValue(new Response("{}", { status: 400 }));
    expect(await enviarLegenda("vid-1", "pt", "Português", "WEBVTT\n")).toBe(false);
  });
});

describe("apagarLegenda", () => {
  it("DELETE no vídeo e no idioma; 404 conta como apagada", async () => {
    expect(await apagarLegenda("vid-1", "en")).toBe(true);
    const [url, pedido] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://video.bunnycdn.com/library/762605/videos/vid-1/captions/en");
    expect(pedido.method).toBe("DELETE");

    fetchFalso.mockResolvedValue(new Response("{}", { status: 404 }));
    expect(await apagarLegenda("vid-1", "en")).toBe(true);
    fetchFalso.mockResolvedValue(new Response("{}", { status: 500 }));
    expect(await apagarLegenda("vid-1", "en")).toBe(false);
  });
});

// A LIMPEZA DO CACHE (04/10/2026): o endereço da legenda e o playlist do vídeo,
// com a CHAVE DA CONTA — formato da referência oficial "Purge URL".
describe("limparCacheDaLegenda", () => {
  const ENV_CACHE = ["BUNNY_ACCOUNT_API_KEY", "BUNNY_STREAM_LESSONS_CDN_HOST"] as const;
  const antesCache = Object.fromEntries(ENV_CACHE.map((n) => [n, process.env[n]]));
  afterEach(() => {
    for (const n of ENV_CACHE) {
      if (antesCache[n] === undefined) delete process.env[n];
      else process.env[n] = antesCache[n];
    }
  });

  it("limpa a legenda e o playlist, com a chave da conta", async () => {
    process.env.BUNNY_ACCOUNT_API_KEY = "chave-da-conta";
    process.env.BUNNY_STREAM_LESSONS_CDN_HOST = "vz-teste.b-cdn.net";

    expect(await limparCacheDaLegenda("vid-1", "pt")).toBe(true);

    const urls = fetchFalso.mock.calls.map(([url]) => decodeURIComponent(new URL(url as string).searchParams.get("url") ?? ""));
    expect(urls).toEqual(["https://vz-teste.b-cdn.net/vid-1/captions/pt.vtt", "https://vz-teste.b-cdn.net/vid-1/playlist.m3u8"]);
    for (const [url, pedido] of fetchFalso.mock.calls as [string, RequestInit][]) {
      expect(url.startsWith("https://api.bunny.net/purge?url=")).toBe(true);
      expect(pedido.method).toBe("POST");
      expect((pedido.headers as Record<string, string>).AccessKey).toBe("chave-da-conta");
    }
  });

  it("sem a chave da conta: false, e nada é chamado", async () => {
    delete process.env.BUNNY_ACCOUNT_API_KEY;
    process.env.BUNNY_STREAM_LESSONS_CDN_HOST = "vz-teste.b-cdn.net";
    expect(await limparCacheDaLegenda("vid-1", "pt")).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  // A chave da conta abre o Bunny inteiro: NUNCA em log (achado P2 da revisão de
  // segurança, 04/10/2026), nem quando o Bunny recusa, nem quando a rede cai.
  it.each([
    ["o Bunny recusou", () => fetchFalso.mockResolvedValue(new Response("{}", { status: 401 }))],
    ["a rede caiu", () => fetchFalso.mockRejectedValue(new Error("rede fora, chave-da-conta"))],
  ])("%s: false, e a chave não aparece no log", async (_nome, preparar) => {
    process.env.BUNNY_ACCOUNT_API_KEY = "chave-da-conta";
    process.env.BUNNY_STREAM_LESSONS_CDN_HOST = "vz-teste.b-cdn.net";
    preparar();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await limparCacheDaLegenda("vid-1", "pt")).toBe(false);

    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("chave-da-conta");
    log.mockRestore();
  });
});
