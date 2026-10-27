// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { SCRIPT_DA_ORIGEM } from "@jilson/core";
import { captureUtmOnce, getStoredAttribution } from "./attribution";

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

// A HOME (página do servidor, sem o app) grava a origem com `SCRIPT_DA_ORIGEM` (core/src/constants/origem.ts):
// o que ela grava tem de ser o que o app lê na hora de assinar — senão a origem do YouTube se perde.
describe("a origem gravada pela home", () => {
  const rodarOScriptDaHome = () => new Function(SCRIPT_DA_ORIGEM)();

  it("grava o utm_source e o utm_campaign no formato que o app lê", () => {
    window.history.pushState({}, "", "/?utm_source=youtube&utm_campaign=video-excel");
    rodarOScriptDaHome();
    const lida = getStoredAttribution();
    expect(lida).toMatchObject({ source: "youtube", campaign: "video-excel" });
    expect(typeof lida?.capturedAt).toBe("string");
  });

  it("o primeiro acesso vence — nem a home nem o app sobrescrevem", () => {
    window.history.pushState({}, "", "/?utm_source=youtube&utm_campaign=primeiro");
    rodarOScriptDaHome();
    window.history.pushState({}, "", "/?utm_source=instagram&utm_campaign=segundo");
    rodarOScriptDaHome();
    captureUtmOnce();
    expect(getStoredAttribution()).toMatchObject({ source: "youtube", campaign: "primeiro" });
  });

  it("sem utm no endereço, não grava nada", () => {
    rodarOScriptDaHome();
    expect(getStoredAttribution()).toBeNull();
  });
});

describe("attribution", () => {
  it("captures utm_source/utm_campaign on first touch", () => {
    window.history.pushState(
      {},
      "",
      "/?utm_source=youtube&utm_campaign=video123",
    );
    captureUtmOnce();
    const a = getStoredAttribution();
    expect(a?.source).toBe("youtube");
    expect(a?.campaign).toBe("video123");
  });

  it("does not overwrite an existing capture (first-touch wins)", () => {
    window.history.pushState({}, "", "/?utm_source=youtube&utm_campaign=first");
    captureUtmOnce();
    window.history.pushState(
      {},
      "",
      "/?utm_source=instagram&utm_campaign=second",
    );
    captureUtmOnce();
    expect(getStoredAttribution()?.source).toBe("youtube");
    expect(getStoredAttribution()?.campaign).toBe("first");
  });

  it("stores nothing when there are no utm params", () => {
    window.history.pushState({}, "", "/");
    captureUtmOnce();
    expect(getStoredAttribution()).toBeNull();
  });
});
