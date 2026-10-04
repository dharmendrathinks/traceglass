import {
  ShieldCheck,
  Workflow,
  Fingerprint,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { PRIVACY_NOTE } from "../core/report";
export function Guide({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="page-section guide">
      <h1>How to use Traceglass</h1>
      <p className="lede">
        Record twice, compare the requests, and investigate the differences.
      </p>
      <div className="guide-grid">
        <article className="panel">
          <Workflow />
          <h2>01 / Capture twice</h2>
          <p>
            Open DevTools → Traceglass. Name a journey, start recording, perform
            the actions and stop. Repeat on the candidate build. Capture
            navigation and wait for outstanding calls before stopping.
          </p>
          <p>
            Keep the same device, data, actions, throttling and cache state.
            Record those conditions with the capture.
          </p>
        </article>
        <article className="panel">
          <Fingerprint />
          <h2>02 / Compare intentionally</h2>
          <p>
            Select a baseline and candidate. Choose their primary origins.
            Origin mapping matches those two origins as <code>@app</code> so
            staging and production can be compared.
          </p>
          <p>
            Numeric IDs, asset hashes and query values are collapsed. Distinct
            operations on the same route—including GraphQL—can be combined. This
            is a route comparison, not a payload diff.
          </p>
        </article>
        <article className="panel">
          <ShieldCheck />
          <h2>03 / Keep the evidence local</h2>
          <p>{PRIVACY_NOTE}</p>
          <p>
            No account, telemetry, remote scripts, backend or AI API.
            Uninstalling the extension removes its local data. Use capture
            exports for backups.
          </p>
        </article>
        <article className="panel">
          <Terminal />
          <h2>04 / Know the boundaries</h2>
          <p>
            Durations describe individual requests. The waterfall’s span is
            observed network activity, not page load time or Core Web Vitals.
            Requests can overlap; adding their durations would be misleading.
          </p>
          <p>
            Only completed HTTP(S) requests are captured. WebSocket frames,
            response contents, console errors and requests before recording are
            not collected. Unknown bytes remain unknown. P95 requires at least
            20 timed requests per route.
          </p>
        </article>
      </div>
      <div className="guide-footer">
        <div>
          <h2>Explore a controlled example</h2>
          <p>
            See a slower API, a retry burst, a heavier bundle and a failed
            checkout. All data is fictional.
          </p>
        </div>
        <button className="button primary" onClick={onDemo}>
          Open example <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
