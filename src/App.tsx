import {
  Activity,
  ArrowDownToLine,
  BookOpen,
  Check,
  FileCode2,
  FlaskConical,
  FolderOpen,
  GitCompareArrows,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useWorkspace, type View } from "./useWorkspace";
import { savePolicy } from "./core/store";
import { PRIVACY_NOTE } from "./core/report";
import { CaptureDialog } from "./components/CaptureDialog";
import { CaptureEditor } from "./components/CaptureEditor";
import { CaptureLibrary } from "./components/CaptureLibrary";
import { ComparisonView } from "./components/ComparisonView";
import { Guide } from "./components/Guide";
import { Modal } from "./components/Modal";
import { PolicyEditor } from "./components/PolicyEditor";
export default function App() {
  const state = useWorkspace();
  const {
    view,
    setView,
    captures,
    policy,
    setPolicy,
    loading,
    busy,
    toast,
    setToast,
    captureOpen,
    setCaptureOpen,
    editing,
    setEditing,
    exportOpen,
    setExportOpen,
    fileInput,
    notify,
    save,
    add,
    example,
    importFile,
    exportReport,
  } = state;
  const nav: [View, string, typeof Activity][] = [
    ["compare", "Comparison", GitCompareArrows],
    ["library", "Capture library", FolderOpen],
    ["policy", "Policies & budgets", SlidersHorizontal],
    ["guide", "Field guide", BookOpen],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("compare");
          }}
          aria-label="Traceglass home"
        >
          <span className="brand-icon">
            <Activity size={23} />
          </span>
          <span>Traceglass</span>
        </a>
        <nav aria-label="Main navigation">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-label={label}
              title={label}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => setView(id)}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "library" && (
                <span className="nav-count">{captures.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="example-card">
            <button onClick={() => void example()} disabled={busy || loading}>
              <FlaskConical size={16} /> Explore example
            </button>
          </div>
          <div className="privacy-status">
            <ShieldCheck size={16} />
            <span>
              Saved on this device<small>No account required</small>
            </span>
            <span className="live-dot" />
          </div>
          <div className="version">
            TRACEGLASS <span>v0.1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="workspace-label">Local workspace</span>
          <div className="top-actions">
            <span className="local-label">
              <span className="live-dot" /> Local only
            </span>
            <button
              className="button secondary"
              onClick={() => fileInput.current?.click()}
              disabled={busy || loading}
            >
              <Upload size={15} />
              {busy ? "Working…" : "Import HAR"}
            </button>
            <button
              className="button primary"
              onClick={() => setCaptureOpen(true)}
              disabled={loading}
            >
              <Plus size={16} /> New capture
            </button>
          </div>
        </header>
        <input
          ref={fileInput}
          type="file"
          className="visually-hidden"
          aria-label="Import capture file"
          accept=".har,.json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFile(file);
          }}
        />
        <main className="main-content">
          {loading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" />
              <h1>Opening your workspace…</h1>
            </div>
          ) : view === "guide" ? (
            <Guide onDemo={() => void example()} />
          ) : view === "policy" ? (
            <PolicyEditor
              key={JSON.stringify(policy)}
              policy={policy}
              onSave={async (p) => {
                await savePolicy(p);
                setPolicy(p);
                notify("Comparison policy saved.");
              }}
            />
          ) : view === "library" ? (
            <CaptureLibrary state={state} />
          ) : (
            <ComparisonView state={state} />
          )}
        </main>
      </div>
      {toast && (
        <div
          role={toast.error ? "alert" : "status"}
          className={`toast ${toast.error ? "error" : ""}`}
        >
          {toast.error ? <TriangleAlert size={17} /> : <Check size={17} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {captureOpen && (
        <CaptureDialog onClose={() => setCaptureOpen(false)} onSave={add} />
      )}
      {editing && (
        <CaptureEditor
          capture={editing}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            await save(c);
            notify("Capture details updated.");
          }}
        />
      )}
      {exportOpen && (
        <Modal title="Export comparison" onClose={() => setExportOpen(false)}>
          <p>
            A standalone report with findings, route deltas, budgets and
            comparison conditions.
          </p>
          <div className="export-options">
            <button onClick={() => exportReport("html")}>
              <LayoutDashboard size={24} />
              <span>
                <strong>HTML report</strong>
                <small>Designed for sharing and printing. Works offline.</small>
              </span>
              <ArrowDownToLine size={18} />
            </button>
            <button onClick={() => exportReport("md")}>
              <FileCode2 size={24} />
              <span>
                <strong>Markdown report</strong>
                <small>Ready for a pull request or an issue.</small>
              </span>
              <ArrowDownToLine size={18} />
            </button>
          </div>
          <p className="privacy-note">
            <LockKeyhole size={16} />
            {PRIVACY_NOTE}
          </p>
        </Modal>
      )}
    </div>
  );
}
