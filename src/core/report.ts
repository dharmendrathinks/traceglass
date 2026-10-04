import type { Capture, Comparison, Policy } from "./model";
import { bytes, duration, signed } from "./format";

export const PRIVACY_NOTE =
  "Headers, cookies, bodies, query values and fragments are excluded. Hostnames, normalized paths, labels and test notes remain and can contain sensitive information. Data stays in this browser unless you export it.";
export function escapeHTML(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
function md(value: string): string {
  return escapeHTML(value)
    .replace(/[\\`*_[\]{}|]/g, "\\$&")
    .replace(/[\r\n]+/g, " ");
}
export function markdownReport(
  a: Capture,
  b: Capture,
  result: Comparison,
  policy: Policy,
): string {
  return [
    "# Traceglass · Journey comparison",
    "",
    `${md(a.name)} → ${md(b.name)}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Capture sources: ${a.source} → ${b.source}. ${a.source === "demo" || b.source === "demo" ? "SYNTHETIC DEMONSTRATION." : ""}`,
    "",
    `Baseline: ${md(a.environment || "Not specified")} · ${a.createdAt}`,
    `Candidate: ${md(b.environment || "Not specified")} · ${b.createdAt}`,
    `Baseline conditions: ${md(a.conditions || "Not recorded")}`,
    `Candidate conditions: ${md(b.conditions || "Not recorded")}`,
    "",
    "| Metric | Baseline | Candidate |",
    "| --- | ---: | ---: |",
    `| Requests | ${result.before.count} | ${result.after.count} |`,
    `| Known transfer (lower bound if incomplete) | ${bytes(result.before.bytes)} | ${bytes(result.after.bytes)} |`,
    `| Failed responses | ${result.before.errors} | ${result.after.errors} |`,
    "",
    "## Findings",
    "",
    ...result.findings.flatMap((f) => [
      `### ${md(f.title)} · ${f.severity}`,
      md(f.route),
      md(f.detail),
      md(f.action),
      "",
    ]),
    ...(result.findings.length
      ? []
      : [
          "No configured thresholds crossed. This is not a release-readiness verdict.",
          "",
        ]),
    "## Routes",
    "",
    "| Route | Calls A → B | Median Δ | Transfer Δ |",
    "| --- | ---: | ---: | ---: |",
    ...result.routes.map(
      (r) =>
        `| ${md(r.key)} | ${r.before?.count ?? 0} → ${r.after?.count ?? 0} | ${signed(r.latencyDelta, duration)} | ${signed(r.bytesDelta, bytes)} |`,
    ),
    "",
    "## Candidate budgets",
    "",
    ...result.budgets.map(
      (x) =>
        `- ${x.name}: ${Math.round(x.value)} / ${x.limit} ${x.unit} · ${x.exceeded ? "exceeded" : x.incomplete ? "incomplete" : "within budget"}${x.incomplete ? " (known lower bound)" : ""}`,
    ),
    "",
    "## Interpretation",
    "",
    ...result.caveats.map((x) => `- ${md(x)}`),
    "",
    "## Policy",
    "",
    `Median change ≥ ${policy.latencyMs} ms AND ≥ ${policy.latencyPercent}%; transfer increase ≥ ${policy.transferKB} KB; additional calls ≥ ${policy.extraCalls}; origin mapping ${policy.mapOrigins ? "on" : "off"}.`,
    "",
    "## Data handling",
    "",
    PRIVACY_NOTE,
    "",
  ].join("\n");
}
export function htmlReport(
  a: Capture,
  b: Capture,
  result: Comparison,
  policy: Policy,
): string {
  const e = escapeHTML;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Traceglass · ${e(b.name)}</title><style>body{font:15px/1.6 system-ui,sans-serif;background:#f5f5f0;color:#172323;margin:0;padding:48px 24px}main{max-width:1100px;margin:auto}h1{font-size:38px;letter-spacing:-1.5px}header{border-bottom:2px solid #168379;padding-bottom:24px}small{color:#536260}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:12px;border-bottom:1px solid #d5dedb;overflow-wrap:anywhere}article{padding:16px 22px;background:white;border:1px solid #d5dedb;border-radius:10px;margin:12px 0}code{overflow-wrap:anywhere}h2{margin-top:36px}li{margin:8px 0}.stats{display:flex;gap:30px;flex-wrap:wrap;margin:24px 0}.stats b{font-size:26px;display:block}.high{border-left:4px solid #b63340}.medium{border-left:4px solid #a26315}.info{border-left:4px solid #168379}@media print{body{padding:0;background:white}article,tr{break-inside:avoid}}</style></head><body><main><header><strong>◈ TRACEGLASS / RELEASE EVIDENCE</strong><h1>${e(a.name)} → ${e(b.name)}</h1><p>${e(a.environment || "Baseline")} → ${e(b.environment || "Candidate")}</p><small>${e(a.createdAt)} → ${e(b.createdAt)} · ${a.source === "demo" || b.source === "demo" ? "Synthetic demonstration" : "Observed network metadata"}</small><p>Baseline conditions: ${e(a.conditions || "Not recorded")}<br>Candidate conditions: ${e(b.conditions || "Not recorded")}</p></header><div class="stats"><div><small>REQUESTS</small><b>${result.before.count} → ${result.after.count}</b></div><div><small>KNOWN TRANSFER</small><b>${bytes(result.before.bytes)} → ${bytes(result.after.bytes)}</b></div><div><small>FAILED RESPONSES</small><b>${result.before.errors} → ${result.after.errors}</b></div></div><h2>What changed</h2>${result.findings.map((f) => `<article class="${f.severity}"><small>${f.severity.toUpperCase()}</small><h3>${e(f.title)}</h3><code>${e(f.route)}</code><p>${e(f.detail)}</p><p>${e(f.action)}</p></article>`).join("") || "<p>No configured thresholds crossed. This is not a release-readiness verdict.</p>"}<h2>Route comparison</h2><table><thead><tr><th>Route</th><th>Calls A → B</th><th>Median Δ</th><th>Transfer Δ</th></tr></thead><tbody>${result.routes.map((r) => `<tr><td>${e(r.key)}</td><td>${r.before?.count ?? 0} → ${r.after?.count ?? 0}</td><td>${signed(r.latencyDelta, duration)}</td><td>${signed(r.bytesDelta, bytes)}</td></tr>`).join("")}</tbody></table><h2>Candidate budgets</h2><ul>${result.budgets.map((x) => `<li>${x.name}: ${Math.round(x.value)} / ${x.limit} ${x.unit} — ${x.exceeded ? "exceeded" : x.incomplete ? "incomplete" : "within budget"}${x.incomplete ? " (known lower bound)" : ""}</li>`).join("")}</ul><h2>Interpretation</h2><ul>${result.caveats.map((x) => `<li>${e(x)}</li>`).join("")}</ul><p>Policy: median change ≥ ${policy.latencyMs} ms and ≥ ${policy.latencyPercent}%; transfer increase ≥ ${policy.transferKB} KB; additional calls ≥ ${policy.extraCalls}; origin mapping ${policy.mapOrigins ? "on" : "off"}.</p><h2>Data handling</h2><p>${PRIVACY_NOTE}</p><small>Generated ${new Date().toISOString()} · Traceglass 0.1.0 · All analysis runs locally.</small></main></body></html>`;
}
export function download(text: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
