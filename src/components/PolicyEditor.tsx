import { useState } from "react";
import { Save, RotateCcw, Info } from "lucide-react";
import { DEFAULT_POLICY, policySchema, type Policy } from "../core/model";

export function PolicyEditor({
  policy,
  onSave,
}: {
  policy: Policy;
  onSave: (p: Policy) => Promise<void>;
}) {
  const [draft, setDraft] = useState(policy),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const fields: {
    key: keyof Omit<Policy, "mapOrigins">;
    title: string;
    unit: string;
    help: string;
    max: number;
    min: number;
  }[] = [
    {
      key: "latencyMs",
      title: "Median latency increase",
      unit: "ms",
      help: "Must cross both the absolute and percentage thresholds.",
      min: 1,
      max: 60000,
    },
    {
      key: "latencyPercent",
      title: "Relative latency increase",
      unit: "%",
      help: "Used alongside the absolute latency threshold.",
      min: 1,
      max: 1000,
    },
    {
      key: "transferKB",
      title: "Extra transfer per route",
      unit: "KB",
      help: "Known transferred bytes, including headers when available.",
      min: 1,
      max: 100000,
    },
    {
      key: "extraCalls",
      title: "Additional calls per route",
      unit: "calls",
      help: "Grouped route count increase. Intentional polling may trigger this.",
      min: 1,
      max: 5000,
    },
    {
      key: "maxRequests",
      title: "Journey request budget",
      unit: "requests",
      help: "Maximum candidate request count.",
      min: 1,
      max: 5000,
    },
    {
      key: "maxTransferKB",
      title: "Journey transfer budget",
      unit: "KB",
      help: "Unknown sizes make the budget result incomplete.",
      min: 1,
      max: 1000000,
    },
    {
      key: "maxErrors",
      title: "Failed response budget",
      unit: "responses",
      help: "HTTP 4xx, 5xx and status 0. Includes cancellations.",
      min: 0,
      max: 5000,
    },
  ];
  async function save() {
    const parsed = policySchema.safeParse(draft);
    if (!parsed.success) {
      setError("Enter valid numbers within the displayed limits.");
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-section">
      <h1>Policies & budgets</h1>
      <p className="lede">
        Set the thresholds used to flag changes in your recordings.
      </p>
      <form
        className="policy-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="section-heading">
          <h2>Signals & budgets</h2>
          <span className="pill">Local workspace</span>
        </div>
        <div className="policy-grid">
          {fields.map((f) => (
            <label key={f.key} className="policy-field">
              <span>{f.title}</span>
              <small>{f.help}</small>
              <div className="input-unit">
                <input
                  type="number"
                  required
                  min={f.min}
                  max={f.max}
                  step={
                    ["extraCalls", "maxRequests", "maxErrors"].includes(f.key)
                      ? 1
                      : "any"
                  }
                  value={Number.isNaN(draft[f.key]) ? "" : draft[f.key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.valueAsNumber })
                  }
                />
                <span>{f.unit}</span>
              </div>
            </label>
          ))}
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.mapOrigins}
            onChange={(e) =>
              setDraft({ ...draft, mapOrigins: e.target.checked })
            }
          />
          <span>
            Map each capture’s primary origin to <code>@app</code>
            <small>
              Enables staging-to-production comparisons. Other origins match
              exactly.
            </small>
          </span>
        </label>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button ghost"
            onClick={() => setDraft(DEFAULT_POLICY)}
          >
            <RotateCcw size={15} /> Reset fields
          </button>
          <button className="button primary" disabled={busy}>
            <Save size={15} /> {busy ? "Saving…" : "Save policy"}
          </button>
        </div>
      </form>
      <p className="info-line">
        <Info size={16} /> Thresholds highlight observations. They do not
        certify release readiness or statistical significance.
      </p>
    </section>
  );
}
