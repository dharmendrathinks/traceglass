import { describe, it, expect } from "vitest";
import { compare, percentile, summarize } from "./compare";
import { demoCaptures } from "./demo";
import { DEFAULT_POLICY, type Capture } from "./model";

describe("comparison", () => {
  it("explains the four seeded regression mechanisms without conflating new routes", () => {
    const [a, b] = demoCaptures(),
      r = compare(a, b, DEFAULT_POLICY);
    expect(
      [
        ...new Set(
          r.findings.filter((f) => f.severity !== "info").map((f) => f.title),
        ),
      ].sort(),
    ).toEqual(
      [
        "Additional repeated calls",
        "More data transferred",
        "More failed responses",
        "Slower response times",
      ].sort(),
    );
    expect(
      r.findings.filter((f) => f.title === "New route observed"),
    ).toHaveLength(1);
    expect(
      r.routes.find((r) => r.key.includes("app.:hash.js"))?.bytesDelta,
    ).toBe(272000);
    expect(
      r.routes.find((r) => r.key.endsWith("/api/projects"))?.latencyDelta,
    ).toBe(440);
  });
  it("does not label all requests new when selected primary origins differ", () => {
    const [a, b] = demoCaptures();
    expect(compare(a, b, DEFAULT_POLICY).routes).toHaveLength(12);
    expect(
      compare(a, b, { ...DEFAULT_POLICY, mapOrigins: false }).routes.length,
    ).toBeGreaterThan(20);
  });
  it("produces no signals for identical captures", () => {
    const [a] = demoCaptures();
    expect(compare(a, { ...a, id: "other" }, DEFAULT_POLICY).findings).toEqual(
      [],
    );
  });
  it("distinguishes HTTP methods on the same path", () => {
    const [a] = demoCaptures();
    const r = a.requests[0]!;
    const c = { ...a, requests: [r, { ...r, method: "POST" }] };
    expect(compare(c, c, DEFAULT_POLICY).routes).toHaveLength(2);
  });
  it("does not claim a byte regression when one size is unknown", () => {
    const [a, b] = demoCaptures();
    b.requests.find((r) => r.kind === "script")!.bytes = null;
    const result = compare(a, b, DEFAULT_POLICY);
    expect(
      result.findings.some((f) => f.title === "More data transferred"),
    ).toBe(false);
    expect(result.budgets.find((b) => b.name === "Transfer")?.incomplete).toBe(
      true,
    );
    expect(result.caveats.join(" ")).toContain("lower bounds");
  });
  it("requires both latency thresholds and preserves small sample caveats", () => {
    const [a, b] = demoCaptures();
    expect(
      compare(a, b, { ...DEFAULT_POLICY, latencyMs: 500 }).findings.some(
        (f) => f.title === "Slower response times",
      ),
    ).toBe(false);
    expect(
      compare(a, b, { ...DEFAULT_POLICY, latencyPercent: 500 }).findings.some(
        (f) => f.title === "Slower response times",
      ),
    ).toBe(false);
    expect(compare(a, b, DEFAULT_POLICY).caveats[0]).toContain("statistical");
  });
  it("does not fabricate p95 for tiny samples", () => {
    const [a] = demoCaptures();
    const c: Capture = {
      ...a,
      requests: Array.from({ length: 20 }, (_, i) => ({
        ...a.requests[0]!,
        duration: i + 1,
      })),
    };
    expect(compare(c, c, DEFAULT_POLICY).routes[0]!.before!.p95).toBeCloseTo(
      19.05,
    );
    expect(compare(a, a, DEFAULT_POLICY).routes[0]!.before!.p95).toBeNull();
  });
  it("uses failure rate, not raw volume, to flag regressions", () => {
    const [c] = demoCaptures(),
      good = c.requests[0]!,
      bad = { ...good, status: 500 };
    const a = { ...c, requests: [good, bad] },
      b = { ...c, requests: [good, bad, good, bad] };
    expect(
      compare(a, b, DEFAULT_POLICY).findings.some((f) => f.severity === "high"),
    ).toBe(false);
    expect(
      compare(
        { ...a, requests: [good] },
        { ...b, requests: [{ ...good, status: 0 }] },
        DEFAULT_POLICY,
      ).findings.some((f) => f.severity === "high"),
    ).toBe(true);
  });
  it("treats missing routes as coverage questions, not performance improvements", () => {
    const [a] = demoCaptures();
    const r = compare(
      a,
      { ...a, requests: a.requests.slice(0, 1) },
      DEFAULT_POLICY,
    );
    expect(r.findings.every((f) => f.severity === "info")).toBe(true);
    expect(r.caveats.join(" ")).toContain("coverage");
  });
  it("flags capped captures and condition differences", () => {
    const [a, b] = demoCaptures();
    b.quality.truncated = 1;
    b.conditions = "different";
    const r = compare(a, b, DEFAULT_POLICY);
    expect(r.caveats.join(" ")).toContain("incomplete");
    expect(r.caveats.join(" ")).toContain("conditions differ");
    expect(r.budgets.every((b) => b.incomplete)).toBe(true);
  });
  it("computes span from overlapping requests instead of summing durations", () => {
    const [a] = demoCaptures();
    const r = a.requests[0]!;
    expect(
      summarize({
        ...a,
        requests: [
          { ...r, start: 0, duration: 100 },
          { ...r, start: 50, duration: 100 },
        ],
      }).span,
    ).toBe(150);
  });
  it("handles percentiles and empty samples precisely", () => {
    expect(percentile([], 0.5)).toBeNull();
    expect(percentile([1, 9, 3, 7], 0.5)).toBe(5);
  });
  it("scales to the capture limit deterministically", () => {
    const [a] = demoCaptures();
    const c = {
      ...a,
      requests: Array.from({ length: 5000 }, (_, i) => ({
        ...a.requests[0]!,
        id: String(i),
        path: `/route-${i}`,
        duration: i,
      })),
    };
    const r = compare(c, c, DEFAULT_POLICY);
    expect(r.routes).toHaveLength(5000);
    expect(r.findings).toHaveLength(0);
  });
});
