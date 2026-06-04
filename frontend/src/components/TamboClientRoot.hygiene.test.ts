/**
 * Static analysis tests for TamboClientRoot.tsx — ensures the provider
 * does NOT silently fall back to the stub/mock provider when the API
 * key is missing. Mock mode must be an explicit opt-in.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT_PATH = resolve(__dirname, "TamboClientRoot.tsx");

function readComponent(): string {
  return readFileSync(COMPONENT_PATH, "utf-8");
}

describe("TamboClientRoot — no silent mock fallback", () => {
  it("does not use `!TAMBO_API_KEY` inside the USE_MOCK expression", () => {
    const content = readComponent();
    // Find the USE_MOCK constant assignment and assert that the
    // expression on the right-hand side does NOT reference TAMBO_API_KEY.
    const useMockMatch = content.match(
      /(?:const|let|var)\s+USE_MOCK\s*=\s*([\s\S]*?);/,
    );
    expect(useMockMatch, "USE_MOCK constant not found").toBeTruthy();
    const expr = useMockMatch?.[1] ?? "";
    expect(
      expr,
      "USE_MOCK expression must not depend on TAMBO_API_KEY (silent fallback).",
    ).not.toMatch(/!\s*TAMBO_API_KEY/);
    expect(expr).not.toMatch(/!\s*apiKey/);
  });

  it("USE_MOCK is driven only by NEXT_PUBLIC_USE_MOCK_DATA", () => {
    const content = readComponent();
    const match = content.match(
      /(?:const|let|var)\s+USE_MOCK\s*=\s*([^;]+);/,
    );
    expect(match, "USE_MOCK constant not found").toBeTruthy();
    const expr = match?.[1] ?? "";
    expect(expr).toContain("NEXT_PUBLIC_USE_MOCK_DATA");
    expect(expr, "USE_MOCK must not depend on TAMBO_API_KEY").not.toContain(
      "TAMBO_API_KEY",
    );
  });

  it("renders a visible error or logs a warning when API key is missing", () => {
    const content = readComponent();
    const hasWarning = /(console\.(warn|error))|throw\s+new\s+Error/.test(content);
    const hasVisibleError =
      /data-(?:testid|error|missing)/i.test(content) ||
      /<[A-Z][^>]*>\s*[^<]*(?:missing|TAMBO_API_KEY|required)[^<]*</i.test(content);
    expect(
      hasWarning || hasVisibleError,
      "When USE_MOCK is false and TAMBO_API_KEY is empty, the component " +
        "must surface a console.warn/error or render a visible error message.",
    ).toBe(true);
  });
});
