import {
  captureSchema,
  MAX_FILE_BYTES,
  MAX_REQUESTS,
  type Capture,
  type RequestRecord,
} from "./model";

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function number(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
    ? value
    : null;
}
export function routePath(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        return ":encoded";
      }
      if (/^:\w+$/.test(decoded)) return decoded;
      if (/^\d+$/.test(decoded)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(decoded)) return ":id";
      if (
        decoded.includes("@") ||
        /[?#;\s<>]/.test(decoded) ||
        decoded.length > 80
      )
        return ":redacted";
      if (/^[a-z\d_-]{20,}$/i.test(decoded) && /\d/.test(decoded))
        return ":token";
      return segment
        .replace(/([.-])[a-f0-9]{8,}(?=\.)/gi, "$1:hash")
        .slice(0, 100);
    })
    .join("/")
    .slice(0, 1500);
}
function resourceKind(type: unknown, mime: unknown): RequestRecord["kind"] {
  const t = String(type ?? "").toLowerCase();
  if (t === "xhr" || t === "fetch") return "fetch";
  if (["document", "script", "stylesheet", "image", "font"].includes(t))
    return t as RequestRecord["kind"];
  const m = String(mime ?? "").toLowerCase();
  if (m.includes("json")) return "fetch";
  if (m.includes("javascript")) return "script";
  if (m.includes("html")) return "document";
  if (m.includes("css")) return "stylesheet";
  if (m.startsWith("image/")) return "image";
  if (m.includes("font")) return "font";
  return "other";
}

/** Whitelist projection: never copy headers, bodies, query values, fragments or credentials. */
export function sanitizeEntry(
  value: unknown,
  index: number,
): RequestRecord | null {
  const entry = object(value),
    req = object(entry.request),
    res = object(entry.response),
    content = object(res.content);
  if (typeof req.url !== "string" || req.url.length > 16384) return null;
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.origin.length > 300)
    return null;
  const status = number(res.status);
  if (status === null || !Number.isInteger(status) || status > 599) return null;
  const rawMethod = String(req.method ?? "").toUpperCase();
  if (!/^[A-Z-]{1,20}$/.test(rawMethod)) return null;
  const time =
    typeof entry.startedDateTime === "string"
      ? Date.parse(entry.startedDateTime)
      : NaN;
  // bodySize is transferred response body; content.size is decoded and must not substitute it.
  const body = number(res.bodySize),
    headers = number(res.headersSize);
  const bytes =
    number(res._transferSize) ??
    (body !== null && headers !== null ? body + headers : null);
  return {
    id: `r${index}`,
    method: rawMethod,
    origin: url.origin,
    path: routePath(url.pathname),
    status,
    kind: resourceKind(entry._resourceType, content.mimeType),
    start: number(time),
    duration: number(entry.time),
    bytes,
    wait: number(object(entry.timings).wait),
  };
}

export function makeCapture(
  requests: RequestRecord[],
  options: Partial<Omit<Capture, "version" | "requests">> = {},
): Capture {
  if (!requests.length)
    throw new Error(
      "No supported HTTP requests found. Capture a journey or choose another HAR file.",
    );
  const starts = requests.flatMap((r) => (r.start === null ? [] : [r.start]));
  const first = starts.length ? Math.min(...starts) : 0;
  const origin =
    requests.find((r) => r.kind === "document")?.origin ?? requests[0]!.origin;
  return captureSchema.parse({
    version: 1,
    id: crypto.randomUUID(),
    name: "Untitled journey",
    createdAt: new Date().toISOString(),
    source: "har",
    primaryOrigin: origin,
    environment: "",
    conditions: "",
    quality: { skipped: 0, truncated: 0, navigations: 0 },
    ...options,
    requests: requests.map((r) => ({
      ...r,
      start: r.start === null ? null : r.start - first,
    })),
  });
}

export function importHar(value: unknown, name = "Imported journey"): Capture {
  const entries = object(object(value).log).entries;
  if (!Array.isArray(entries))
    throw new Error("This is not a HAR file. Expected log.entries.");
  const records: RequestRecord[] = [];
  let skipped = 0;
  for (const entry of entries.slice(0, MAX_REQUESTS)) {
    const record = sanitizeEntry(entry, records.length);
    if (record) records.push(record);
    else skipped++;
  }
  return makeCapture(records, {
    name: name.slice(0, 100) || "Imported journey",
    quality: {
      skipped,
      truncated: Math.max(0, entries.length - MAX_REQUESTS),
      navigations: 0,
    },
  });
}

export function parseImport(text: string, name: string): Capture {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES)
    throw new Error(
      "File exceeds the 20 MB import limit. Export a shorter journey.",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON. Choose a HAR or Traceglass capture file.");
  }
  const candidate = object(parsed);
  if (candidate.version === 1 && Array.isArray(candidate.requests)) {
    const result = captureSchema.safeParse(parsed);
    if (!result.success)
      throw new Error(
        "This Traceglass capture is invalid or uses an unsupported format.",
      );
    // Re-project portable captures too: extra keys are rejected by the schema.
    return {
      ...result.data,
      source: result.data.source === "demo" ? "demo" : "har",
      id: crypto.randomUUID(),
      requests: result.data.requests.map((r) => ({
        ...r,
        path: routePath(r.path.split("?")[0]!.split("#")[0]!),
      })),
    };
  }
  return importHar(parsed, name.replace(/\.(har|json)$/i, ""));
}
