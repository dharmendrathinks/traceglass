import {
  type Capture,
  type Group,
  type Summary,
  type Policy,
  type Comparison,
  type RouteDiff,
  type Finding,
  type RequestRecord,
} from "./model";

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p,
    lower = Math.floor(index),
    upper = Math.ceil(index);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}
const failed = (r: RequestRecord) => r.status === 0 || r.status >= 400;
export function summarize(capture: Capture): Summary {
  const r = capture.requests;
  const starts = r.flatMap((x) => (x.start === null ? [] : [x.start]));
  const ends = r.flatMap((x) =>
    x.start === null || x.duration === null ? [] : [x.start + x.duration],
  );
  return {
    count: r.length,
    bytes: r.reduce((sum, x) => sum + (x.bytes ?? 0), 0),
    errors: r.filter(failed).length,
    median: percentile(
      r.flatMap((x) => (x.duration === null ? [] : [x.duration])),
      0.5,
    ),
    span:
      ends.length && starts.length
        ? Math.max(...ends) - Math.min(...starts)
        : null,
    unknownBytes: r.filter((x) => x.bytes === null).length,
    unknownDuration: r.filter((x) => x.duration === null).length,
  };
}
function group(capture: Capture, policy: Policy): Map<string, Group> {
  const groups = new Map<string, Group>();
  for (const r of capture.requests) {
    const host =
      policy.mapOrigins && r.origin === capture.primaryOrigin
        ? "@app"
        : r.origin;
    const key = `${r.method} ${host}${r.path}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        method: r.method,
        path: r.path,
        host,
        requests: [],
        count: 0,
        errors: 0,
        bytes: 0,
        unknownBytes: 0,
        median: null,
        p95: null,
        timed: 0,
      };
      groups.set(key, g);
    }
    g.requests.push(r);
    g.count++;
    if (failed(r)) g.errors++;
    g.bytes += r.bytes ?? 0;
    if (r.bytes === null) g.unknownBytes++;
  }
  for (const g of groups.values()) {
    const times = g.requests.flatMap((r) =>
      r.duration === null ? [] : [r.duration],
    );
    g.median = percentile(times, 0.5);
    g.p95 = times.length >= 20 ? percentile(times, 0.95) : null;
    g.timed = times.length;
  }
  return groups;
}
export function compare(
  before: Capture,
  after: Capture,
  policy: Policy,
): Comparison {
  const a = group(before, policy),
    b = group(after, policy);
  const routes: RouteDiff[] = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(key),
      y = b.get(key),
      findings: Finding[] = [];
    const add = (
      type: string,
      severity: Finding["severity"],
      title: string,
      detail: string,
      action: string,
    ) =>
      findings.push({
        id: `${key}:${type}`,
        route: key,
        severity,
        title,
        detail,
        action,
      });
    const bytesDelta =
      (x?.unknownBytes ?? 0) + (y?.unknownBytes ?? 0)
        ? null
        : (y?.bytes ?? 0) - (x?.bytes ?? 0);
    const latencyDelta =
      x?.median != null && y?.median != null ? y.median - x.median : null;
    const countDelta = (y?.count ?? 0) - (x?.count ?? 0);
    if (y && y.errors > 0 && y.errors / y.count > (x ? x.errors / x.count : 0))
      add(
        "errors",
        "high",
        "More failed responses",
        `${x?.errors ?? 0}/${x?.count ?? 0} → ${y.errors}/${y.count} responses failed (HTTP 4xx/5xx or status 0). Candidate failure statuses: ${[...new Set(y.requests.filter(failed).map((r) => r.status))].join(", ")}.`,
        "Inspect failing status codes and reproduce the same action. Status 0 can also mean cancellation or a network failure.",
      );
    if (
      x &&
      y &&
      latencyDelta !== null &&
      latencyDelta >= policy.latencyMs &&
      latencyDelta >= ((x.median ?? 0) * policy.latencyPercent) / 100
    )
      add(
        "latency",
        "medium",
        "Slower response times",
        `Median increased ${Math.round(latencyDelta)} ms across ${x.timed} → ${y.timed} timed requests.`,
        "Repeat under matching cache, data and network conditions. These are observations from two journeys, not a statistical confidence claim.",
      );
    if (x && y && countDelta >= policy.extraCalls)
      add(
        "calls",
        "medium",
        "Additional repeated calls",
        `${x.count} → ${y.count} requests to this route. Query values and dynamic IDs are grouped.`,
        "Check retries, polling and duplicate effects. Grouped requests may represent different operations; repetition alone is not proof of a bug.",
      );
    if (bytesDelta !== null && bytesDelta >= policy.transferKB * 1024)
      add(
        "weight",
        "medium",
        "More data transferred",
        `${Math.round(bytesDelta / 1024)} KB added across this route.`,
        "Check bundle composition, payload size and caching. Intentional functionality can justify extra bytes.",
      );
    if (!x && y)
      add(
        "new",
        "info",
        "New route observed",
        `${y.count} request${y.count === 1 ? "" : "s"} to a route absent from the baseline.`,
        "Verify that both captures cover the same journey. New routes may be expected.",
      );
    if (x && !y)
      add(
        "removed",
        "info",
        "Route no longer observed",
        `${x.count} baseline request${x.count === 1 ? "" : "s"} absent from this capture.`,
        "Check feature and journey coverage before treating fewer requests as an improvement.",
      );
    routes.push({
      key,
      before: x,
      after: y,
      findings,
      bytesDelta,
      latencyDelta,
      countDelta,
    });
  }
  const severityRank = { high: 0, medium: 1, info: 2 };
  routes.sort(
    (x, y) =>
      Math.min(3, ...x.findings.map((f) => severityRank[f.severity])) -
        Math.min(3, ...y.findings.map((f) => severityRank[f.severity])) ||
      (y.bytesDelta ?? 0) - (x.bytesDelta ?? 0) ||
      x.key.localeCompare(y.key),
  );
  const findings = routes
    .flatMap((r) => r.findings)
    .sort((x, y) => severityRank[x.severity] - severityRank[y.severity]);
  const left = summarize(before),
    right = summarize(after);
  const caveats = [
    "Compare the same actions, data, cache state and network conditions. Two journeys do not establish statistical significance.",
    "Requests are grouped by method, origin and normalized path. Query values, numeric IDs and asset hashes are ignored; GraphQL operations sharing a path are combined.",
  ];
  if (policy.mapOrigins && before.primaryOrigin !== after.primaryOrigin)
    caveats.push(
      `Origin mapping enabled: ${before.primaryOrigin} and ${after.primaryOrigin} share @app. Other origins match exactly.`,
    );
  if (left.unknownBytes || right.unknownBytes)
    caveats.push(
      `${left.unknownBytes} baseline and ${right.unknownBytes} candidate requests have unknown transfer sizes. Totals are lower bounds; affected route size comparisons are unavailable.`,
    );
  if (left.unknownDuration || right.unknownDuration)
    caveats.push("Some durations are unavailable and excluded from medians.");
  if ([before, after].some((c) => c.quality.skipped || c.quality.truncated))
    caveats.push(
      "Capture is incomplete: some requests were skipped or exceeded the capture limit. Absence is not evidence of removal.",
    );
  if (before.conditions !== after.conditions)
    caveats.push(
      "Recorded test conditions differ. Timing and weight changes may reflect these conditions.",
    );
  if (Math.max(left.count, right.count) > Math.min(left.count, right.count) * 2)
    caveats.push(
      "Request counts differ by more than 2×. Check journey coverage before attributing the change to a release.",
    );
  const incomplete = after.quality.skipped > 0 || after.quality.truncated > 0;
  const budgets = [
    {
      name: "Requests",
      value: right.count,
      limit: policy.maxRequests,
      unit: "requests",
      incomplete,
    },
    {
      name: "Transfer",
      value: right.bytes / 1024,
      limit: policy.maxTransferKB,
      unit: "KB",
      incomplete: incomplete || right.unknownBytes > 0,
    },
    {
      name: "Failed responses",
      value: right.errors,
      limit: policy.maxErrors,
      unit: "responses",
      incomplete,
    },
  ].map((x) => ({ ...x, exceeded: x.value > x.limit }));
  return { routes, findings, before: left, after: right, caveats, budgets };
}
