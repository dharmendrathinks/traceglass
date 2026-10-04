import { importHar } from "./ingest";
import type { Capture } from "./model";

/** Fictional, deterministic fixture. No requests are sent to these reserved domains. */
export function demoCaptures(): [Capture, Capture] {
  function capture(candidate: boolean): Capture {
    const host = candidate
      ? "https://preview.northstar.test"
      : "https://app.northstar.test";
    const specs: [string, string, number, number, number, number, string][] = [
      ["GET", "/workspace", 1, 142, 18500, 200, "document"],
      [
        "GET",
        candidate ? "/assets/app.bbccee22.js" : "/assets/app.aabbcc11.js",
        1,
        candidate ? 410 : 188,
        candidate ? 486000 : 214000,
        200,
        "script",
      ],
      ["GET", "/assets/style.css", 1, 52, 12000, 200, "stylesheet"],
      ["GET", "/assets/inter.woff2", 1, 76, 42000, 200, "font"],
      ["GET", "/api/projects", 3, candidate ? 620 : 180, 6400, 200, "fetch"],
      [
        "GET",
        "/api/notifications",
        candidate ? 12 : 3,
        110,
        1200,
        200,
        "fetch",
      ],
      [
        "POST",
        "/api/checkout",
        1,
        candidate ? 340 : 210,
        800,
        candidate ? 503 : 200,
        "fetch",
      ],
      ["GET", "/api/profile/1234", 1, 84, 2100, 200, "fetch"],
      ["GET", "/images/avatar.webp", 1, 38, 8400, 200, "image"],
      ["GET", "/api/workspaces", 2, 95, 3200, 200, "fetch"],
      [
        "GET",
        "https://assets.northstar.test/logo.svg",
        1,
        42,
        2800,
        200,
        "image",
      ],
    ];
    if (candidate)
      specs.push([
        "POST",
        "https://insights.vendor.test/collect",
        3,
        78,
        1300,
        204,
        "fetch",
      ]);
    let cursor = 0;
    const entries = specs.flatMap(
      ([method, path, count, time, size, status, kind]) =>
        Array.from({ length: count }, (_, i) => {
          cursor += 42;
          return {
            startedDateTime: new Date(
              Date.UTC(2026, 9, 3, 10, candidate ? 5 : 0) + cursor,
            ).toISOString(),
            time: time + ((i % 3) - 1) * 12,
            _resourceType: kind,
            request: {
              method,
              url: path.startsWith("https:")
                ? path
                : host + path + "?session=example-removed",
            },
            response: {
              status,
              _transferSize: size,
              content: { mimeType: kind === "fetch" ? "application/json" : "" },
            },
            timings: { wait: time * 0.72 },
          };
        }),
    );
    const c = importHar(
      { log: { entries } },
      candidate ? "Checkout · release candidate" : "Checkout · production",
    );
    return {
      ...c,
      id: candidate ? "demo-candidate" : "demo-baseline",
      source: "demo",
      createdAt: candidate
        ? "2026-10-03T10:05:00.000Z"
        : "2026-10-03T10:00:00.000Z",
      environment: candidate ? "Preview · v2.9.0" : "Production · v2.8.4",
      conditions: "Synthetic example · same checkout journey · cold cache",
    };
  }
  return [capture(false), capture(true)];
}
