import { useEffect, useRef, useState } from "react";
import { Circle, Square, Radio, Monitor } from "lucide-react";
import { Recorder, type NetworkEvents } from "../capture";
import type { Capture } from "../core/model";
import { Modal } from "./Modal";

export function CaptureDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (capture: Capture) => Promise<void>;
}) {
  const available = !!globalThis.chrome?.devtools?.network;
  const recorder = useRef<Recorder | null>(null);
  const [count, setCount] = useState(0),
    [active, setActive] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [name, setName] = useState(""),
    [environment, setEnvironment] = useState(""),
    [conditions, setConditions] = useState("");
  const [pending, setPending] = useState<Capture | null>(null);
  useEffect(() => () => recorder.current?.cancel(), []);
  function start() {
    setError("");
    setCount(0);
    const r = new Recorder(
      chrome.devtools.network as unknown as NetworkEvents,
      setCount,
    );
    recorder.current = r;
    r.start();
    setActive(true);
  }
  async function stop() {
    setActive(false);
    setSaving(true);
    try {
      const capture =
        pending ??
        recorder.current!.stop(
          name.trim(),
          environment.trim(),
          conditions.trim(),
        );
      setPending(capture);
      await onSave(capture);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title="Capture a journey" onClose={onClose}>
      {!available ? (
        <>
          <div className="instruction-icon">
            <Monitor size={26} />
          </div>
          <h3>Start inside Chrome DevTools</h3>
          <p>
            Live recording belongs to the tab you are testing. Open that tab’s
            DevTools, choose <strong>Traceglass</strong>, then start a capture.
          </p>
          <ol className="steps">
            <li>
              Open your app and press <kbd>⌘⌥I</kbd> on Mac or{" "}
              <kbd>Ctrl Shift I</kbd> on Windows/Linux.
            </li>
            <li>
              Select Traceglass in the DevTools tabs (it may be under{" "}
              <strong>»</strong>).
            </li>
            <li>Start capture, perform your journey, then stop and save.</li>
          </ol>
          <p className="muted">
            Already have a HAR? Import it into this workspace. Captures saved in
            DevTools are available here after refresh.
          </p>
          <button className="button primary full" onClick={onClose}>
            Got it
          </button>
        </>
      ) : (
        <>
          <p>
            Capture the same actions in each release. Only requests that finish
            while recording are included.
          </p>
          <label>
            Journey name
            <input
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Checkout · release candidate"
              disabled={active || saving || !!pending}
            />
          </label>
          <label>
            Environment / build
            <input
              maxLength={100}
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="Preview · v2.9.0"
              disabled={active || saving || !!pending}
            />
          </label>
          <label>
            Test conditions
            <textarea
              maxLength={500}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Cold cache, no throttling, same test account and actions"
              disabled={active || saving || !!pending}
            />
          </label>
          {active && (
            <div className="recording-status" role="status">
              <Radio size={20} />
              <span>
                <strong>{count} requests captured</strong>
                <small>
                  Exercise your app, then return here. Limit: 5,000 requests.
                </small>
              </span>
            </div>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <p className="muted small">
            Headers, bodies and query values are discarded. Hosts and normalized
            paths remain. Closing DevTools or this dialog discards the unsaved
            recording.
          </p>
          <button
            className={`button full ${active ? "danger" : "primary"}`}
            disabled={saving || (!active && !name.trim())}
            onClick={() => (active || pending ? void stop() : start())}
          >
            {active ? <Square size={15} /> : <Circle size={15} />}{" "}
            {saving
              ? "Saving…"
              : pending
                ? "Retry save"
                : active
                  ? "Stop & save capture"
                  : "Start capture"}
          </button>
        </>
      )}
    </Modal>
  );
}
