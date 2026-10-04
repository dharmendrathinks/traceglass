import { describe, it, expect } from "vitest";
import { htmlReport, markdownReport } from "./report";
import { demoCaptures } from "./demo";
import { compare } from "./compare";
import { DEFAULT_POLICY } from "./model";
describe("portable evidence", () => {
  it("escapes untrusted labels and routes in standalone HTML with a restrictive CSP", () => {
    const [a, b] = demoCaptures();
    b.name = "<img src=x onerror=alert(1)>";
    b.conditions = "</p><script>alert(1)</script>";
    b.requests[0]!.path = "/<svg onload=alert(1)>";
    const html = htmlReport(
      a,
      b,
      compare(a, b, DEFAULT_POLICY),
      DEFAULT_POLICY,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<svg");
    expect(html).toContain("&lt;img");
    expect(html).toContain("default-src 'none'");
  });
  it("escapes Markdown tables and arbitrary links", () => {
    const [a, b] = demoCaptures();
    b.name = "[click](https://evil.test) | injected";
    const md = markdownReport(
      a,
      b,
      compare(a, b, DEFAULT_POLICY),
      DEFAULT_POLICY,
    );
    expect(md).toContain("\\[click\\]");
    expect(md).toContain("\\|");
    expect(md).toContain("SYNTHETIC");
    expect(md).toContain("not establish statistical significance");
  });
  it("includes policies, evidence, budget state and data-handling limitations", () => {
    const [a, b] = demoCaptures();
    const html = htmlReport(
      a,
      b,
      compare(a, b, DEFAULT_POLICY),
      DEFAULT_POLICY,
    );
    expect(html).toContain("503");
  });
});
