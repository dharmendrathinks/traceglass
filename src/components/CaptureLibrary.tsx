import { ArrowDownToLine, Database, LockKeyhole, Trash2 } from "lucide-react";
import type { WorkspaceState } from "../useWorkspace";
import { MAX_CAPTURES } from "../core/model";
import { download, PRIVACY_NOTE } from "../core/report";
export function CaptureLibrary({ state }: { state: WorkspaceState }) {
  const {
    setView,
    captures,
    setBaselineId,
    setCandidateId,
    setEditing,
    setSelected,
    fileInput,
    remove,
  } = state;
  return (
    <section className="page-section">
      <div className="title-row">
        <div>
          <h1>Capture library</h1>
          <p className="lede">
            Your saved recordings. Choose any two to compare.
          </p>
        </div>
        <span className="pill">
          {captures.length} / {MAX_CAPTURES} captures
        </span>
      </div>
      {!captures.length ? (
        <div className="empty-panel">
          <Database size={32} />
          <h2>Your first capture starts here.</h2>
          <p>Import a HAR file or record a journey in DevTools.</p>
          <button
            className="button secondary"
            onClick={() => fileInput.current?.click()}
          >
            Import a capture
          </button>
        </div>
      ) : (
        <div className="library-grid">
          {captures.map((c) => (
            <article className="capture-card" key={c.id}>
              <div className="section-heading">
                <span
                  className={`pill ${c.source === "demo" ? "demo-pill" : ""}`}
                >
                  {c.source === "demo"
                    ? "Synthetic example"
                    : c.source === "har"
                      ? "File import"
                      : "DevTools capture"}
                </span>
                <button
                  className="icon-button"
                  title="Delete capture"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => void remove(c)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h2>{c.name}</h2>
              <p className="mono small muted">{c.primaryOrigin}</p>
              <div className="capture-numbers">
                <span>
                  <b>{c.requests.length}</b> requests
                </span>
                <span>
                  {new Date(c.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="small muted">
                {c.environment || "Environment not recorded"}
              </p>
              <div className="capture-card-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    setBaselineId(c.id);
                    setView("compare");
                    setSelected(null);
                  }}
                >
                  Set baseline
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCandidateId(c.id);
                    setView("compare");
                    setSelected(null);
                  }}
                >
                  Set candidate
                </button>
                <button className="button ghost" onClick={() => setEditing(c)}>
                  Details
                </button>
                <button
                  className="icon-button"
                  aria-label={`Export ${c.name}`}
                  onClick={() =>
                    download(
                      JSON.stringify(c, null, 2),
                      "traceglass-capture.json",
                      "application/json",
                    )
                  }
                >
                  <ArrowDownToLine size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="info-line">
        <LockKeyhole size={15} />
        {PRIVACY_NOTE}
      </p>
    </section>
  );
}
