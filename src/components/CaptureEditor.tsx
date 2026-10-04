import { useState } from "react";
import type { Capture } from "../core/model";
import { Modal } from "./Modal";
export function CaptureEditor({
  capture,
  onSave,
  onClose,
}: {
  capture: Capture;
  onSave: (c: Capture) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(capture),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Capture details" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void onSave(draft)
            .then(onClose)
            .catch((e) => setError(String(e)))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Name
          <input
            required
            maxLength={100}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          Environment / build
          <input
            maxLength={100}
            value={draft.environment}
            onChange={(e) =>
              setDraft({ ...draft, environment: e.target.value })
            }
          />
        </label>
        <label>
          Primary origin
          <select
            value={draft.primaryOrigin}
            onChange={(e) =>
              setDraft({ ...draft, primaryOrigin: e.target.value })
            }
          >
            {[...new Set(draft.requests.map((r) => r.origin))].map((origin) => (
              <option key={origin}>{origin}</option>
            ))}
          </select>
          <small>
            When mapping is enabled, this origin is matched as @app.
          </small>
        </label>
        <label>
          Test conditions
          <textarea
            maxLength={500}
            value={draft.conditions}
            onChange={(e) => setDraft({ ...draft, conditions: e.target.value })}
          />
        </label>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          Save details
        </button>
      </form>
    </Modal>
  );
}
