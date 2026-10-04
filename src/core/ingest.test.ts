import { describe, it, expect } from "vitest";
import { importHar, parseImport, routePath, sanitizeEntry } from "./ingest";
import { MAX_REQUESTS } from "./model";
import { demoCaptures } from "./demo";

import { entry } from "./test-helpers";
describe("trust boundary", () => {
  it("whitelists metadata without retaining credentials, headers, cookies, query, fragment or bodies", () => {
    const result = sanitizeEntry(
      entry(
        "https://user:password@app.test/api/users/123?access_token=SECRET#SECRET",
      ),
      0,
    )!;
    expect(result.path).toBe("/api/users/:id");
    expect(result.origin).toBe("https://app.test");
    expect(result.bytes).toBe(1200);
    expect(JSON.stringify(result)).not.toMatch(
      /SECRET|password|user:|headers|cookies|postData/,
    );
  });
  it.each([
    "data:text/plain,private",
    "file:///Users/private",
    "javascript:alert(1)",
    "broken",
    "ftp://a.test/file",
  ])("rejects unsupported URL %s", (url) =>
    expect(sanitizeEntry(entry(url), 0)).toBeNull(),
  );
  it("keeps unknown transfer unknown instead of using decoded body size", () => {
    expect(
      sanitizeEntry(
        entry(undefined, {
          response: {
            status: 200,
            bodySize: -1,
            headersSize: -1,
            content: { size: 50000 },
          },
        }),
        0,
      )!.bytes,
    ).toBeNull();
  });
  it("respects zero transfer for cache hits", () => {
    expect(
      sanitizeEntry(
        entry(undefined, {
          response: {
            status: 200,
            _transferSize: 0,
            bodySize: 1000,
            headersSize: 200,
          },
        }),
        0,
      )!.bytes,
    ).toBe(0);
  });
  it("turns unavailable or invalid metrics into null", () => {
    const r = sanitizeEntry(
      entry(undefined, {
        time: -1,
        startedDateTime: "bad",
        timings: { wait: NaN },
      }),
      0,
    )!;
    expect([r.duration, r.start, r.wait]).toEqual([null, null, null]);
  });
  it.each([undefined, -1, 600, 200.5, "200"])(
    "rejects invalid status %s",
    (status) =>
      expect(
        sanitizeEntry(entry(undefined, { response: { status } }), 0),
      ).toBeNull(),
  );
  it.each([
    ["/users/42", "/users/:id"],
    ["/users/86e6ddad-200a-400d-b488-f2cf2a8c145c", "/users/:id"],
    ["/users/ada%40example.test", "/users/:redacted"],
    ["/app.aabbccdd.js", "/app.:hash.js"],
    ["/reset/abc12def34ghi56jkl789", "/reset/:token"],
    ["/api/%ZZ", "/api/:encoded"],
    ["/api/:id", "/api/:id"],
  ])("normalizes %s", (input, expected) =>
    expect(routePath(input)).toBe(expected),
  );
  it("preserves custom action paths and origin ports", () => {
    const r = sanitizeEntry(
      entry("http://localhost:3000/api/send-message"),
      0,
    )!;
    expect(r.path).toBe("/api/send-message");
    expect(r.origin).toBe("http://localhost:3000");
  });
  it("reports invalid and capped HAR entries", () => {
    const c = importHar({
      log: { entries: [{}, ...Array(MAX_REQUESTS).fill(entry())] },
    });
    expect(c.requests).toHaveLength(MAX_REQUESTS - 1);
    expect(c.quality).toMatchObject({ skipped: 1, truncated: 1 });
  });
  it("normalizes out-of-order timestamps without negative offsets", () => {
    const c = importHar({
      log: {
        entries: [
          entry(undefined, { startedDateTime: "2026-10-03T10:00:02Z" }),
          entry(),
        ],
      },
    });
    expect(c.requests.map((r) => r.start)).toEqual([2000, 0]);
  });
  it("fails usefully for malformed and empty files", () => {
    expect(() => parseImport("{", "bad.har")).toThrow("Invalid JSON");
    expect(() => importHar({})).toThrow("log.entries");
    expect(() => importHar({ log: { entries: [] } })).toThrow(
      "No supported HTTP",
    );
  });
  it("round trips portable captures with a new ID and validates format", () => {
    const c = demoCaptures()[0];
    const imported = parseImport(JSON.stringify(c), "capture.json");
    expect(imported.requests).toEqual(c.requests);
    expect(imported.id).not.toBe(c.id);
    expect(() =>
      parseImport(JSON.stringify({ ...c, headers: "SECRET" }), "evil.json"),
    ).toThrow("invalid");
  });
  it("rejects duplicate request identities and relabels portable captures as imported", () => {
    const c = demoCaptures()[0];
    c.source = "devtools";
    expect(parseImport(JSON.stringify(c), "capture.json").source).toBe("har");
    c.requests[1]!.id = c.requests[0]!.id;
    expect(() => parseImport(JSON.stringify(c), "capture.json")).toThrow(
      "invalid",
    );
  });
  it("sanitizes injected portable paths and rejects credential-bearing origins", () => {
    const c = demoCaptures()[0];
    c.requests[0]!.path = "/users/123?token=SECRET#fragment";
    expect(
      parseImport(JSON.stringify(c), "capture.json").requests[0]!.path,
    ).toBe("/users/:id");
    c.requests[0]!.origin = "https://user:password@app.test";
    expect(() => parseImport(JSON.stringify(c), "capture.json")).toThrow(
      "invalid",
    );
  });
});
