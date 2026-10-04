import { makeCapture, sanitizeEntry } from "./core/ingest";
import { MAX_REQUESTS, type Capture, type RequestRecord } from "./core/model";

export interface NetworkEvents {
  onRequestFinished: {
    addListener(cb: (r: unknown) => void): void;
    removeListener(cb: (r: unknown) => void): void;
  };
  onNavigated: {
    addListener(cb: () => void): void;
    removeListener(cb: () => void): void;
  };
}
/** Explicitly scoped lifecycle; only already-sanitized metadata is retained. */
export class Recorder {
  private requests: RequestRecord[] = [];
  private skipped = 0;
  private truncated = 0;
  private navigations = 0;
  private started = 0;
  private active = false;
  constructor(
    private network: NetworkEvents,
    private changed: (count: number) => void,
    private now = () => Date.now(),
  ) {}
  private request = (raw: unknown) => {
    if (!this.active) return;
    if (this.requests.length >= MAX_REQUESTS) {
      this.truncated++;
      return;
    }
    const record = sanitizeEntry(raw, this.requests.length);
    if (!record) {
      this.skipped++;
      return;
    }
    // onRequestFinished can include requests started before the user began capture.
    if (record.start !== null && record.start < this.started) return;
    this.requests.push(record);
    this.changed(this.requests.length);
  };
  private navigate = () => {
    this.navigations++;
  };
  start(): void {
    if (this.active) return;
    this.requests = [];
    this.skipped = 0;
    this.truncated = 0;
    this.navigations = 0;
    this.started = this.now();
    this.active = true;
    this.network.onRequestFinished.addListener(this.request);
    this.network.onNavigated.addListener(this.navigate);
  }
  cancel(): void {
    this.active = false;
    this.network.onRequestFinished.removeListener(this.request);
    this.network.onNavigated.removeListener(this.navigate);
  }
  stop(name: string, environment: string, conditions: string): Capture {
    this.cancel();
    return makeCapture(this.requests, {
      source: "devtools",
      name,
      environment,
      conditions,
      quality: {
        skipped: this.skipped,
        truncated: this.truncated,
        navigations: this.navigations,
      },
    });
  }
}
