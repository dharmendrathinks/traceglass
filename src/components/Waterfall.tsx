import type { Capture } from "../core/model";
import { duration } from "../core/format";
export function Waterfall({
  baseline,
  candidate,
}: {
  baseline: Capture;
  candidate: Capture;
}) {
  const combined = [...baseline.requests, ...candidate.requests];
  const max = Math.max(
    1,
    ...combined.map((r) => (r.start ?? 0) + (r.duration ?? 0)),
  );
  return (
    <div className="panel waterfall">
      <div className="section-heading">
        <div>
          <h2>Journey timelines</h2>
          <p>Shared time scale · completed requests · first 100 per capture</p>
        </div>
        <span className="muted small">
          Network activity, not page load time
        </span>
      </div>
      <div className="waterfall-axis">
        <span>0</span>
        <span>{duration(max / 2)}</span>
        <span>{duration(max)}</span>
      </div>
      {[baseline, candidate].map((capture, i) => (
        <section key={capture.id}>
          <h3>
            <span className={`dot ${i ? "mint" : "slate"}`} />
            {i ? "Candidate" : "Baseline"}{" "}
            <span className="muted">/ {capture.name}</span>
          </h3>
          {capture.requests.slice(0, 100).map((r) => (
            <div className="waterfall-row" key={r.id}>
              <span title={r.origin + r.path}>{r.path}</span>
              <div className="waterfall-track">
                {r.start !== null && r.duration !== null ? (
                  <span
                    className={`waterfall-bar ${i ? "candidate" : "baseline"} ${r.status === 0 || r.status >= 400 ? "failed" : ""}`}
                    style={{
                      left: `${(r.start / max) * 100}%`,
                      width: `${Math.max(0.4, (r.duration / max) * 100)}%`,
                    }}
                    title={`${r.method} ${r.path} · ${duration(r.duration)} · HTTP ${r.status}`}
                  />
                ) : (
                  <small>Timing unavailable</small>
                )}
              </div>
              <code>{duration(r.duration)}</code>
            </div>
          ))}
          {capture.requests.length > 100 && (
            <p className="muted">
              Showing 100 of {capture.requests.length} requests. All requests
              contribute to the comparison.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
