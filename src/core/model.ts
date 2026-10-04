import { z } from "zod";

export const MAX_REQUESTS = 5000;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_CAPTURES = 40;
const metric = z
  .number()
  .finite()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER)
  .nullable();
export const requestSchema = z
  .object({
    id: z.string().max(100),
    method: z.string().regex(/^[A-Z-]{1,20}$/),
    origin: z
      .string()
      .max(300)
      .refine((v) => {
        try {
          const u = new URL(v);
          return /^https?:$/.test(u.protocol) && u.origin === v;
        } catch {
          return false;
        }
      }),
    path: z.string().max(1500).startsWith("/"),
    status: z.number().int().min(0).max(599),
    kind: z.enum([
      "document",
      "script",
      "stylesheet",
      "image",
      "font",
      "fetch",
      "other",
    ]),
    start: metric,
    duration: metric,
    bytes: metric,
    wait: metric,
  })
  .strict();
export type RequestRecord = z.infer<typeof requestSchema>;
export const captureSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    createdAt: z.string().datetime(),
    source: z.enum(["devtools", "har", "demo"]),
    primaryOrigin: z.string().max(300),
    environment: z.string().max(100),
    conditions: z.string().max(500),
    requests: z.array(requestSchema).min(1).max(MAX_REQUESTS),
    quality: z
      .object({
        skipped: z.number().int().min(0),
        truncated: z.number().int().min(0),
        navigations: z.number().int().min(0),
      })
      .strict(),
  })
  .strict()
  .refine((c) => c.requests.some((r) => r.origin === c.primaryOrigin), {
    message: "Primary origin must be present in the capture.",
  })
  .refine(
    (c) => new Set(c.requests.map((r) => r.id)).size === c.requests.length,
    { message: "Request identifiers must be unique." },
  );
export type Capture = z.infer<typeof captureSchema>;
export const policySchema = z
  .object({
    latencyMs: z.number().min(1).max(60000),
    latencyPercent: z.number().min(1).max(1000),
    transferKB: z.number().min(1).max(100000),
    extraCalls: z.number().int().min(1).max(5000),
    maxRequests: z.number().int().min(1).max(5000),
    maxTransferKB: z.number().min(1).max(1000000),
    maxErrors: z.number().int().min(0).max(5000),
    mapOrigins: z.boolean(),
  })
  .strict();
export type Policy = z.infer<typeof policySchema>;
export const DEFAULT_POLICY: Policy = {
  latencyMs: 150,
  latencyPercent: 25,
  transferKB: 50,
  extraCalls: 3,
  maxRequests: 100,
  maxTransferKB: 2000,
  maxErrors: 0,
  mapOrigins: true,
};
export type Finding = {
  id: string;
  route: string;
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  action: string;
};
export type Group = {
  key: string;
  method: string;
  path: string;
  host: string;
  requests: RequestRecord[];
  count: number;
  errors: number;
  bytes: number;
  unknownBytes: number;
  median: number | null;
  p95: number | null;
  timed: number;
};
export type RouteDiff = {
  key: string;
  before?: Group;
  after?: Group;
  findings: Finding[];
  bytesDelta: number | null;
  latencyDelta: number | null;
  countDelta: number;
};
export type Summary = {
  count: number;
  bytes: number;
  errors: number;
  median: number | null;
  span: number | null;
  unknownBytes: number;
  unknownDuration: number;
};
export type Comparison = {
  routes: RouteDiff[];
  findings: Finding[];
  before: Summary;
  after: Summary;
  caveats: string[];
  budgets: {
    name: string;
    value: number;
    limit: number;
    unit: string;
    exceeded: boolean;
    incomplete: boolean;
  }[];
};
