import { useEffect, useMemo, useRef, useState } from "react";
import { compare } from "./core/compare";
import { demoCaptures } from "./core/demo";
import {
  captureSchema,
  DEFAULT_POLICY,
  MAX_CAPTURES,
  type Capture,
  type Policy,
  type RouteDiff,
} from "./core/model";
import { download, htmlReport, markdownReport } from "./core/report";
import {
  deleteCapture,
  listCaptures,
  loadPolicy,
  saveCapture,
  saveCaptures,
} from "./core/store";
export type View = "compare" | "library" | "policy" | "guide";
type Toast = { message: string; error: boolean } | null;
export function useWorkspace() {
  const [view, setView] = useState<View>("compare"),
    [captures, setCaptures] = useState<Capture[]>([]),
    [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);
  const [baselineId, setBaselineId] = useState(""),
    [candidateId, setCandidateId] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<Toast>(null);
  const [captureOpen, setCaptureOpen] = useState(false),
    [editing, setEditing] = useState<Capture | null>(null),
    [exportOpen, setExportOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "routes" | "waterfall">(
      "overview",
    ),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null),
    [page, setPage] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const baseline = captures.find((c) => c.id === baselineId),
    candidate = captures.find((c) => c.id === candidateId);
  const result = useMemo(
    () =>
      baseline && candidate && baseline.id !== candidate.id
        ? compare(baseline, candidate, policy)
        : null,
    [baseline, candidate, policy],
  );
  const selectedRoute = result?.routes.find((r) => r.key === selected);
  function notify(message: string, error = false) {
    setToast({ message, error });
  }
  useEffect(() => {
    void Promise.all([listCaptures(), loadPolicy()])
      .then(([list, p]) => {
        setCaptures(list);
        setPolicy(p);
        setCandidateId(list[0]?.id ?? "");
        setBaselineId(list[1]?.id ?? "");
      })
      .catch((e) => setToast({ message: String(e), error: true }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!toast || toast.error) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function save(capture: Capture) {
    if (
      captures.length >= MAX_CAPTURES &&
      !captures.some((c) => c.id === capture.id)
    )
      throw new Error(
        "Your library holds 40 captures. Export and delete one before adding another.",
      );
    await saveCapture(capture);
    const list = await listCaptures();
    setCaptures(list);
  }
  async function add(capture: Capture) {
    await save(capture);
    if (!baselineId) setBaselineId(capture.id);
    else setCandidateId(capture.id);
    setView("compare");
    setSelected(null);
    notify("Capture saved locally.");
  }
  async function example() {
    setBusy(true);
    try {
      const [a, b] = demoCaptures();
      await saveCaptures([a, b]);
      setCaptures(await listCaptures());
      setBaselineId(a.id);
      setCandidateId(b.id);
      setView("compare");
      setSelected(null);
      setTab("overview");
      notify(
        "Example loaded. All requests are fictional; no network traffic was sent.",
      );
    } catch (e) {
      notify(String(e), true);
    } finally {
      setBusy(false);
    }
  }
  async function remove(capture: Capture) {
    try {
      await deleteCapture(capture.id);
      setCaptures(await listCaptures());
      if (baselineId === capture.id) setBaselineId("");
      if (candidateId === capture.id) setCandidateId("");
      notify(`Deleted “${capture.name}” from this browser.`);
    } catch (e) {
      notify(String(e), true);
    }
  }
  async function importFile(file: File) {
    setBusy(true);
    let worker: Worker | undefined;
    try {
      const capture = await new Promise<Capture>((resolve, reject) => {
        worker = new Worker(new URL("./import.worker.ts", import.meta.url), {
          type: "module",
        });
        const timeout = setTimeout(() => {
          worker?.terminate();
          reject(new Error("Import timed out. Try a smaller file."));
        }, 30000);
        worker.onmessage = (
          event: MessageEvent<{ capture?: unknown; error?: string }>,
        ) => {
          clearTimeout(timeout);
          if (event.data.error) reject(new Error(event.data.error));
          else {
            const parsed = captureSchema.safeParse(event.data.capture);
            if (parsed.success) resolve(parsed.data);
            else reject(new Error("Invalid capture data."));
          }
        };
        worker.onerror = () => {
          clearTimeout(timeout);
          reject(
            new Error("Import worker failed. Reload Traceglass and try again."),
          );
        };
        worker.postMessage({ file });
      });
      await add(capture);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Import failed.", true);
    } finally {
      worker?.terminate();
      setBusy(false);
    }
  }
  function exportReport(format: "html" | "md") {
    if (!baseline || !candidate || !result) return;
    download(
      format === "html"
        ? htmlReport(baseline, candidate, result, policy)
        : markdownReport(baseline, candidate, result, policy),
      `traceglass-report.${format}`,
      format === "html" ? "text/html" : "text/markdown",
    );
    setExportOpen(false);
    notify("Report exported.");
  }
  const visibleRoutes = useMemo(
    () =>
      result?.routes.filter(
        (r) =>
          r.key.toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" ||
            (filter === "signals"
              ? r.findings.some((f) => f.severity !== "info")
              : filter === "new"
                ? !r.before
                : !r.after)),
      ) ?? [],
    [result, query, filter],
  );
  const urgent =
    result?.findings.filter((f) => f.severity === "high").length ?? 0;
  const signalCount =
    result?.findings.filter((f) => f.severity !== "info").length ?? 0;
  function selectRoute(r: RouteDiff) {
    setSelected(selected === r.key ? null : r.key);
  }

  return {
    view,
    setView,
    captures,
    policy,
    setPolicy,
    baselineId,
    setBaselineId,
    candidateId,
    setCandidateId,
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
    notify,
    save,
    add,
    example,
    remove,
    importFile,
    exportReport,
    visibleRoutes,
    urgent,
    signalCount,
    selectRoute,
  };
}
export type WorkspaceState = ReturnType<typeof useWorkspace>;
