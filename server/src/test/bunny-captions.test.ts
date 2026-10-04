import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apagarLegenda, enviarLegenda } from "../lib/bunny-stream.js";

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
