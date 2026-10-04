import { describe, it, expect, vi } from "vitest";
import { Recorder, type NetworkEvents } from "./capture";
import { entry } from "./core/test-helpers";
function event<T>() {
  const listeners = new Set<(v: T) => void>();
  return {
    addListener: (cb: (v: T) => void) => listeners.add(cb),
    removeListener: (cb: (v: T) => void) => listeners.delete(cb),
    emit: (v: T) => listeners.forEach((cb) => cb(v)),
    listeners,
  };
}
describe("recording lifecycle", () => {
  it("only keeps requests started after opt-in, cleans listeners and sanitizes before retention", () => {
    const network = {
      onRequestFinished: event<unknown>(),
      onNavigated: event<void>(),
    };
    const changed = vi.fn();
    const now = Date.parse("2026-10-03T10:00:00Z");
    const recorder = new Recorder(network as NetworkEvents, changed, () => now);
    recorder.start();
    recorder.start();
    expect(network.onRequestFinished.listeners.size).toBe(1);
    network.onRequestFinished.emit(
      entry(undefined, { startedDateTime: "2026-10-03T09:59:59Z" }),
    );
    network.onRequestFinished.emit(entry());
    network.onNavigated.emit();
    const c = recorder.stop("Journey", "Preview", "Cold cache");
    expect(c.requests).toHaveLength(1);
    expect(c.source).toBe("devtools");
    expect(c.quality.navigations).toBe(1);
    expect(JSON.stringify(c)).not.toContain("SECRET");
    expect(network.onRequestFinished.listeners.size).toBe(0);
    expect(network.onNavigated.listeners.size).toBe(0);
    expect(changed).toHaveBeenCalledWith(1);
  });
  it("can restart after an empty capture and bounds retention", () => {
    const network = {
      onRequestFinished: event<unknown>(),
      onNavigated: event<void>(),
    };
    const recorder = new Recorder(
      network as NetworkEvents,
      () => {},
      () => 0,
    );
    recorder.start();
    expect(() => recorder.stop("Empty", "", "")).toThrow("No supported");
    recorder.start();
    for (let i = 0; i < 5003; i++) network.onRequestFinished.emit(entry());
    const c = recorder.stop("Bounded", "", "");
    expect(c.requests).toHaveLength(5000);
    expect(c.quality.truncated).toBe(3);
  });
  it("cancel removes listeners and does not save anything", () => {
    const network = {
      onRequestFinished: event<unknown>(),
      onNavigated: event<void>(),
    };
    const recorder = new Recorder(network as NetworkEvents, () => {});
    recorder.start();
    recorder.cancel();
    expect(network.onRequestFinished.listeners.size).toBe(0);
  });
});
