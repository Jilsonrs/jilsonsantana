import { describe, it, expect } from "vitest";
import { escapeHtml, jsonLd } from "./html.js";

describe("html sanitization", () => {
  describe("escapeHtml", () => {
    it("escapes <script> in text", () => {
      expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    it("escapes quotes inside attributes", () => {
      expect(escapeHtml('class="featured"')).toBe("class=&quot;featured&quot;");
      expect(escapeHtml("onclick='alert(1)'")).toBe("onclick=&#39;alert(1)&#39;");
    });

    it("does not double-escape already escaped strings", () => {
      expect(escapeHtml("&lt;script&gt;")).toBe("&lt;script&gt;");
      expect(escapeHtml("A & B")).toBe("A &amp; B");
      expect(escapeHtml("A &amp; B")).toBe("A &amp; B");
    });
  });

  describe("jsonLd", () => {
    it("escapes </script> inside JSON-LD to prevent breaking out", () => {
      const data = { description: "Here is a </script><script>alert(1)</script>" };
      const serialized = jsonLd(data);
      expect(serialized).toContain("\\u003c/script>");
      expect(serialized).not.toContain("</script>");
    });
  });
});
