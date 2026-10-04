import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronRight,
  FileCode2,
  FlaskConical,
  GitCompareArrows,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
} from "lucide-react";
import type { WorkspaceState } from "../useWorkspace";
import { bytes, duration, signed } from "../core/format";
import { RouteDetail } from "./RouteDetail";
import { Waterfall } from "./Waterfall";
export function ComparisonView({ state }: { state: WorkspaceState }) {
  const {
    setView,
    captures,
    policy,
    baselineId,
    setBaselineId,
    candidateId,
    setCandidateId,
    busy,
    setEditing,
    setExportOpen,
    tab,
    setTab,
    query,
    setQuery,
    filter,
    setFilter,
    selected,
    setSelected,
    page,
    setPage,
    fileInput,
    baseline,
    candidate,
    result,
    selectedRoute,
    example,
    visibleRoutes,
    urgent,
    signalCount,
    selectRoute,
  } = state;
  return (
    <section className="comparison-page">
      <div className="title-row">
        <div>
          <h1>Compare recordings</h1>
          <p className="lede">
            {result
              ? "Changes in requests, response times and transferred data."
              : "Record the same actions before and after a change to your website."}
          </p>
        </div>
        {result && (
          <button
            className="button secondary"
            onClick={() => setExportOpen(true)}
          >
            <ArrowDownToLine size={15} /> Export report
          </button>
        )}
      </div>
      {captures.length > 0 && (
        <div className="comparison-controls">
          <div className="capture-selector">
            <span className="selector-letter">A</span>
            <label>
              Before · Baseline
              <select
                aria-label="Baseline capture"
                value={baselineId}
                onChange={(e) => {
                  setBaselineId(e.target.value);
                  setSelected(null);
                  setPage(0);
                }}
              >
                <option value="">Choose a baseline</option>
                {captures.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {baseline && (
              <button
                className="icon-button"
                aria-label="Edit baseline details"
                onClick={() => setEditing(baseline)}
              >
                <SlidersHorizontal size={14} />
              </button>
            )}
          </div>
          <button
            className="swap-button"
            aria-label="Swap baseline and candidate"
            onClick={() => {
              setBaselineId(candidateId);
              setCandidateId(baselineId);
              setPage(0);
              setSelected(null);
            }}
          >
            <ArrowLeftRight size={17} />
          </button>
          <div className="capture-selector">
            <span className="selector-letter candidate-letter">B</span>
            <label>
              After · Candidate
              <select
                aria-label="Candidate capture"
                value={candidateId}
                onChange={(e) => {
                  setCandidateId(e.target.value);
                  setSelected(null);
                  setPage(0);
                }}
              >
                <option value="">Choose a candidate</option>
                {captures.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {candidate && (
              <button
                className="icon-button"
                aria-label="Edit candidate details"
                onClick={() => setEditing(candidate)}
              >
                <SlidersHorizontal size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      {!result ? (
        <div className="welcome">
          <div className="welcome-symbol" aria-hidden="true">
            <GitCompareArrows size={26} />
          </div>
          <h2>
            {baselineId && baselineId === candidateId
              ? "Choose two different captures."
              : captures.length
                ? "Add a second recording to compare"
                : "Your first comparison starts here"}
          </h2>
          <p>
            {captures.length
              ? "Select a baseline and candidate above, or add another journey."
              : "You perform the actions. Traceglass records the network requests and highlights what changed."}
          </p>
          {!captures.length && (
            <ol className="onboarding-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>Record before</strong>
                  <p>Start a capture, use your website, then stop and save.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Record after</strong>
                  <p>Repeat the same actions on the updated version.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Compare the results</strong>
                  <p>See failed requests, slower responses and extra calls.</p>
                </div>
              </li>
            </ol>
          )}
          <div className="welcome-actions">
            <button
              className="button primary"
              onClick={() => void example()}
              disabled={busy}
            >
              <FlaskConical size={16} /> Explore the example
            </button>
            <button
              className="button secondary"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              <Upload size={16} /> Import your HAR
            </button>
          </div>
          <div className="welcome-features">
            <span>
              <ShieldCheck size={16} /> Local processing
            </span>
            <span>
              <FileCode2 size={16} /> Portable reports
            </span>
            <span>
              <LockKeyhole size={16} /> No account required
            </span>
          </div>
          <button className="text-button" onClick={() => setView("guide")}>
            How to capture a comparable journey <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <>
          {(baseline!.source === "demo" || candidate!.source === "demo") && (
            <div className="demo-banner">
              <FlaskConical size={14} />
              <span>
                Example data <b>·</b> Two fictional checkout recordings.
              </span>
              <button onClick={() => setView("guide")}>
                How it works <ArrowRight size={13} />
              </button>
            </div>
          )}
          {baseline!.quality.skipped +
            baseline!.quality.truncated +
            candidate!.quality.skipped +
            candidate!.quality.truncated >
            0 && (
            <div className="quality-banner" role="status">
              <TriangleAlert size={16} />
              <span>
                <strong>Incomplete capture.</strong> Some requests were skipped
                or exceeded the limit. Missing routes and within-budget results
                need caution.
              </span>
            </div>
          )}
          <div className="metrics-grid">
            <Metric
              title="Requests"
              value={String(result.after.count)}
              baseline={`${result.before.count} in baseline`}
              delta={signed(result.after.count - result.before.count)}
              icon={<GitCompareArrows size={17} />}
            />
            <Metric
              title="Known transfer"
              value={bytes(result.after.bytes)}
              baseline={`${bytes(result.before.bytes)} in baseline${result.before.unknownBytes || result.after.unknownBytes ? " · incomplete" : ""}`}
              delta={signed(result.after.bytes - result.before.bytes, bytes)}
              icon={<ArrowDownToLine size={17} />}
            />
            <Metric
              title="Median request"
              value={duration(result.after.median)}
              baseline={`${duration(result.before.median)} in baseline`}
              delta={signed(
                result.after.median !== null && result.before.median !== null
                  ? result.after.median - result.before.median
                  : null,
                duration,
              )}
              icon={<Activity size={17} />}
            />
            <Metric
              title="Failed responses"
              value={String(result.after.errors)}
              baseline={`${result.before.errors} in baseline`}
              delta={signed(result.after.errors - result.before.errors)}
              icon={<TriangleAlert size={17} />}
              danger={result.after.errors > 0}
            />
          </div>
          <div className="content-toolbar">
            <div className="tabs" role="tablist" aria-label="Comparison view">
              {(
                [
                  ["overview", "Overview", LayoutDashboard],
                  ["routes", "All routes", GitCompareArrows],
                  ["waterfall", "Waterfall", Activity],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  role="tab"
                  aria-selected={tab === id}
                  tabIndex={tab === id ? 0 : -1}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const tabs = ["overview", "routes", "waterfall"] as const;
                    const index = tabs.indexOf(tab);
                    const next =
                      tabs[
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3
                      ]!;
                    setTab(next);
                    setPage(0);
                    document.getElementById(`tab-${next}`)?.focus();
                  }}
                  aria-controls={`panel-${id}`}
                  id={`tab-${id}`}
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setPage(0);
                  }}
                  className={tab === id ? "active" : ""}
                >
                  <Icon size={15} />
                  {label}
                  {id === "routes" && <span>{result.routes.length}</span>}
                </button>
              ))}
            </div>
            <button
              className="text-button policy-link"
              onClick={() => setView("policy")}
            >
              <SlidersHorizontal size={14} />
              {policy.mapOrigins ? "Origins mapped" : "Exact origins"}{" "}
              <ChevronRight size={13} />
            </button>
          </div>
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tab === "waterfall" ? (
              <Waterfall baseline={baseline!} candidate={candidate!} />
            ) : (
              <div
                className={`investigation-layout ${selectedRoute ? "with-detail" : ""}`}
              >
                <div className="investigation-main">
                  {tab === "overview" && (
                    <>
                      <div
                        className={`finding-summary ${urgent ? "has-errors" : ""}`}
                      >
                        <span className="summary-icon">
                          {signalCount ? (
                            <TriangleAlert size={20} />
                          ) : (
                            <Check size={20} />
                          )}
                        </span>
                        <div>
                          <h2>
                            {signalCount
                              ? `${signalCount} changes to investigate`
                              : "No configured thresholds crossed"}
                          </h2>
                          <p>
                            {urgent
                              ? `${urgent} failure signal${urgent === 1 ? "" : "s"}. Select a change below to see the details.`
                              : signalCount
                                ? "Observed changes crossed your comparison thresholds."
                                : "Verify journey coverage and conditions before drawing conclusions."}
                          </p>
                        </div>
                        <span className="pill">
                          {
                            result.findings.filter((f) => f.severity === "info")
                              .length
                          }{" "}
                          route changes
                        </span>
                      </div>
                      <div className="section-heading findings-heading">
                        <h2>What changed</h2>
                        <span className="muted small">
                          Select a row for details
                        </span>
                      </div>
                      <div className="findings-list">
                        {result.findings
                          .filter((f) => f.severity !== "info")
                          .slice(0, 50)
                          .map((f) => (
                            <button
                              key={f.id}
                              className={`finding-row ${selected === f.route ? "selected" : ""}`}
                              onClick={() =>
                                setSelected(
                                  selected === f.route ? null : f.route,
                                )
                              }
                            >
                              <span className={`finding-dot ${f.severity}`} />
                              <span className="finding-content">
                                <strong>{f.title}</strong>
                                <span className="mono">
                                  {f.route.replace(/^\w+ /, "")}
                                </span>
                                <small>{f.detail}</small>
                              </span>
                              <span className={`severity ${f.severity}`}>
                                {f.severity === "high"
                                  ? "Investigate"
                                  : "Watch"}
                              </span>
                              <ChevronRight size={17} />
                            </button>
                          ))}
                        {!signalCount && (
                          <div className="empty-findings">
                            <Check size={22} />
                            <span>
                              No latency, transfer, repetition or failure
                              signals.
                            </span>
                          </div>
                        )}
                      </div>
                      {signalCount > 50 && (
                        <p className="muted small">
                          Showing the first 50 of {signalCount} signals.{" "}
                          <button
                            className="text-button"
                            onClick={() => {
                              setTab("routes");
                              setFilter("signals");
                              setPage(0);
                            }}
                          >
                            Explore all affected routes
                          </button>
                        </p>
                      )}
                      <div className="budgets panel">
                        <div className="section-heading">
                          <h2>Candidate budgets</h2>
                          <button
                            className="text-button"
                            onClick={() => setView("policy")}
                          >
                            Edit policy <ArrowRight size={13} />
                          </button>
                        </div>
                        <div className="budget-grid">
                          {result.budgets.map((b) => (
                            <div className="budget" key={b.name}>
                              <div>
                                <span>{b.name}</span>
                                <span className={b.exceeded ? "red" : "muted"}>
                                  {Math.round(b.value)}{" "}
                                  <small>
                                    / {b.limit} {b.unit}
                                  </small>
                                </span>
                              </div>
                              <div className="budget-track">
                                <span
                                  className={b.exceeded ? "over" : ""}
                                  style={{
                                    width: `${Math.min(100, b.limit ? (b.value / b.limit) * 100 : b.value ? 100 : 0)}%`,
                                  }}
                                />
                              </div>
                              <small className={b.exceeded ? "red" : "muted"}>
                                {b.exceeded
                                  ? "Over budget"
                                  : b.incomplete
                                    ? "Incomplete data"
                                    : "Within budget"}
                                {b.incomplete && b.exceeded
                                  ? " · incomplete data"
                                  : ""}
                              </small>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {tab === "routes" && (
                    <>
                      <div className="route-filters">
                        <label className="search-box">
                          <Search size={16} />
                          <input
                            aria-label="Search routes"
                            placeholder="Filter by route, method or origin…"
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setPage(0);
                            }}
                          />
                        </label>
                        <select
                          aria-label="Route filter"
                          value={filter}
                          onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(0);
                          }}
                        >
                          <option value="all">All routes</option>
                          <option value="signals">With signals</option>
                          <option value="new">New routes</option>
                          <option value="removed">Removed routes</option>
                        </select>
                      </div>
                      <div className="route-table-wrapper">
                        <table className="route-table">
                          <thead>
                            <tr>
                              <th>ROUTE</th>
                              <th>CALLS A → B</th>
                              <th>MEDIAN Δ</th>
                              <th>TRANSFER Δ</th>
                              <th>SIGNALS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRoutes
                              .slice(page * 40, page * 40 + 40)
                              .map((r) => (
                                <tr
                                  key={r.key}
                                  className={
                                    selected === r.key ? "selected" : ""
                                  }
                                >
                                  <td>
                                    <button
                                      className="route-button"
                                      onClick={() => selectRoute(r)}
                                    >
                                      <span className="method">
                                        {(r.after ?? r.before)!.method}
                                      </span>
                                      <span>
                                        <strong>
                                          {(r.after ?? r.before)!.path}
                                        </strong>
                                        <small>
                                          {(r.after ?? r.before)!.host}
                                        </small>
                                      </span>
                                    </button>
                                  </td>
                                  <td>
                                    {r.before?.count ?? 0}
                                    <span className="muted"> → </span>
                                    {r.after?.count ?? 0}
                                  </td>
                                  <td
                                    className={
                                      (r.latencyDelta ?? 0) > 0 ? "amber" : ""
                                    }
                                  >
                                    {signed(r.latencyDelta, duration)}
                                  </td>
                                  <td
                                    className={
                                      (r.bytesDelta ?? 0) > 0 ? "amber" : ""
                                    }
                                  >
                                    {signed(r.bytesDelta, bytes)}
                                  </td>
                                  <td>
                                    <span className="pill">
                                      {r.findings.length || "—"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {!visibleRoutes.length && (
                          <div className="empty-findings">
                            No routes match this filter.
                          </div>
                        )}
                      </div>
                      <div className="pagination">
                        <span>{visibleRoutes.length} routes</span>
                        <button
                          className="button secondary"
                          disabled={page === 0}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </button>
                        <span>
                          {page + 1} /{" "}
                          {Math.max(1, Math.ceil(visibleRoutes.length / 40))}
                        </span>
                        <button
                          className="button secondary"
                          disabled={(page + 1) * 40 >= visibleRoutes.length}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {selectedRoute && (
                  <RouteDetail
                    route={selectedRoute}
                    onClose={() => setSelected(null)}
                  />
                )}
              </div>
            )}
          </div>
          <details className="interpretation">
            <summary>
              <Info size={15} />
              <span>Read the evidence in context</span>
              <span className="muted">
                {result.caveats.length} interpretation notes
              </span>
              <ChevronRight size={14} />
            </summary>
            <ul>
              {result.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="small muted">
              Capture quality · Baseline: {baseline!.quality.skipped} skipped,{" "}
              {baseline!.quality.truncated} truncated. Candidate:{" "}
              {candidate!.quality.skipped} skipped,{" "}
              {candidate!.quality.truncated} truncated.
            </p>
          </details>
          <div className="comparison-footer">
            <span>
              <ShieldCheck size={13} /> Analyzed locally · Metadata only
            </span>
          </div>
        </>
      )}
    </section>
  );
}
function Metric({
  title,
  value,
  baseline,
  delta,
  icon,
  danger = false,
}: {
  title: string;
  value: string;
  baseline: string;
  delta: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`metric-card ${danger ? "metric-danger" : ""}`}>
      <div className="metric-label">
        {title}
        {icon}
      </div>
      <div className="metric-number">
        {value}
        <span
          className={`metric-delta ${delta.startsWith("+") ? "up" : delta.startsWith("-") ? "down" : ""}`}
        >
          {delta}
        </span>
      </div>
      <div className="metric-baseline">{baseline}</div>
    </div>
  );
}
