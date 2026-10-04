import { ArrowUpRight, X, Info } from "lucide-react";
import { bytes, duration, signed } from "../core/format";
import type { RouteDiff } from "../core/model";
export function RouteDetail({
  route,
  onClose,
}: {
  route: RouteDiff;
  onClose: () => void;
}) {
  const group = route.after ?? route.before!;
  return (
    <aside className="route-detail panel" aria-label="Route details">
      <div className="section-heading">
        <div className="eyebrow">ROUTE INSPECTOR</div>
        <button
          className="icon-button"
          aria-label="Close route details"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <span className="method">{group.method}</span>
      <h2 className="route-title">{group.path}</h2>
      <p className="mono muted small">{group.host}</p>
      <dl className="detail-stats">
        <div>
          <dt>Calls</dt>
          <dd>
            {route.before?.count ?? 0} <ArrowUpRight size={13} />{" "}
            {route.after?.count ?? 0}
          </dd>
        </div>
        <div>
          <dt>Median change</dt>
          <dd className={(route.latencyDelta ?? 0) > 0 ? "amber" : ""}>
            {signed(route.latencyDelta, duration)}
          </dd>
        </div>
        <div>
          <dt>Transfer change</dt>
          <dd>{signed(route.bytesDelta, bytes)}</dd>
        </div>
      </dl>
      <table className="detail-table">
        <thead>
          <tr>
            <th>Observed</th>
            <th>Baseline</th>
            <th>Candidate</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              "Median",
              duration(route.before?.median ?? null),
              duration(route.after?.median ?? null),
            ],
            [
              "P95¹",
              duration(route.before?.p95 ?? null),
              duration(route.after?.p95 ?? null),
            ],
            [
              "Failed",
              String(route.before?.errors ?? 0),
              String(route.after?.errors ?? 0),
            ],
            [
              "Timed requests",
              String(route.before?.timed ?? 0),
              String(route.after?.timed ?? 0),
            ],
          ].map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i ? <td key={i}>{cell}</td> : <th key={i}>{cell}</th>,
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted tiny">
        ¹ P95 is shown only with ≥20 timed requests. A sample percentile is not
        a confidence interval.
      </p>
      <h3>Investigation notes</h3>
      {route.findings.length ? (
        route.findings.map((f) => (
          <div className="investigation" key={f.id}>
            <strong>{f.title}</strong>
            <p>{f.action}</p>
          </div>
        ))
      ) : (
        <p className="muted">
          No configured thresholds crossed for this route.
        </p>
      )}
      <div className="detail-status">
        <h3>Candidate responses</h3>
        <div className="status-codes">
          {[...new Set(route.after?.requests.map((r) => r.status) ?? [])]
            .sort()
            .map((status) => (
              <span
                className={`pill ${status === 0 || status >= 400 ? "red-pill" : ""}`}
                key={status}
              >
                {status || "Network / canceled"}{" "}
                <b>
                  ×
                  {
                    route.after!.requests.filter((r) => r.status === status)
                      .length
                  }
                </b>
              </span>
            ))}
        </div>
      </div>
      <p className="info-line tiny">
        <Info size={14} /> Query values and dynamic identifiers are combined in
        this route.
      </p>
    </aside>
  );
}
