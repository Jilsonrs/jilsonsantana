import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Global Vitest setup. Without this, multiple `it`s in the same file render
// into the same jsdom `document` without unmounting between them — harmless
// for single-test files (LoginPage.test.tsx) but produces "multiple elements
// found" failures in any file with 2+ tests (Catalog/CourseDetail/Trilha
// pages, Bloco 5).
afterEach(() => {
  cleanup();
});
