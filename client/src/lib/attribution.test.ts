// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { captureUtmOnce, getStoredAttribution } from "./attribution";

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
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
