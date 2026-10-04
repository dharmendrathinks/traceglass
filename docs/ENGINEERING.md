# Engineering decisions

## Architecture and trust boundary

```text
DevTools completed-request event ─→ whitelist projection ─┐
                                                         ├→ versioned Capture → IndexedDB
HAR file → size gate → dedicated worker → projection ─────┘          │
                                                                   ↓
                                                     deterministic comparison
                                                        │                  │
                                                        ↓                  ↓
                                               React investigation    HTML / Markdown
```

The extension requests no host permissions, `debugger`, `tabs`, `webRequest`, content scripts or persistent page hooks. Its service worker only opens the workspace when the toolbar action is clicked. Recording is confined to an explicit interval inside an inspected tab's DevTools. Chrome's own DevTools may retain raw network information independently; Traceglass neither controls nor claims to erase that native data.

The importer treats every file as untrusted. It checks file size before reading, parses in a worker, rejects unsupported shapes and copies a whitelist rather than deleting a guessed list of sensitive fields. Strict Zod schemas protect imported portable captures and persistence. Unknown fields and duplicate request identifiers are rejected. The UI renders text through React. Standalone HTML escapes all source strings and disables scripts/network access with a restrictive CSP. Markdown escapes HTML and link/table syntax.

The production extension's CSP sets `connect-src 'none'`. Bundles, fonts and icons are local; no remote code or backend is needed. Imports process an explicitly chosen local file. Exports are user-triggered Blob downloads.

## Comparison algorithm

Each side is grouped independently by `method + effective origin + normalized path` using maps. Explicit primary-origin mapping handles production/preview host differences. A union of route keys gives matched, added and absent groups. There is no fuzzy matching that silently associates unrelated routes.

Per-route aggregation computes request count, failure count, known transferred bytes, unknown-size count, median and eligible P95. Sorting samples dominates time at O(n log n); grouping and set union are O(n). Retained capture data is bounded to 5,000 entries. The algorithm is pure and independent of Chrome, storage and React.

Signals have explicit rules:

| Signal             | Rule                                                                     | Interpretation                                                                    |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Failed responses   | Candidate failure proportion exceeds baseline and candidate has failures | HTTP 4xx/5xx or status 0; cancellation is not automatically an application defect |
| Slower response    | Median increase exceeds both configured absolute and relative thresholds | Repeat the measurement under comparable conditions                                |
| Repeated calls     | Matched route count increases by the configured amount                   | Polling, retries or distinct grouped operations may be intentional                |
| Transfer growth    | Fully known route transfer grows above the configured threshold          | Byte growth can be justified by new functionality                                 |
| New / absent route | A route appears on only one side                                         | A coverage question, not an automatic regression/improvement                      |

The overview's global median can stay flat while one API slows down; that is why the route investigation remains primary. P95 at 20 samples is only a descriptive sample statistic. No p-values or confidence intervals are fabricated. Repeated requests within one journey are not treated as independent benchmark runs.

Transfer uses Chrome's `_transferSize` where available, including zero for cache hits. Otherwise both nonnegative HAR `bodySize` and `headersSize` must be known. `content.size` is decoded size and is not a substitute. Any unknown bytes disable the affected route's transfer delta and mark total-budget interpretation incomplete.

## Lifecycle, persistence and bounded work

The recorder attaches listeners once, filters requests started before recording, sanitizes each event immediately and detaches on stop/cancel. Navigations are counted but do not reset a multi-step journey. Only finished requests are available through this API; pending streams are explicitly out of scope. No polling, scheduler or automatic reload is added.

IndexedDB writes resolve only after transaction commit. Multi-capture writes are atomic, including capacity checks and the example pair. Updates remain possible at the 40-capture limit. The stored schema is versioned; unknown versions fail rather than being interpreted optimistically. There is no automatic capture eviction. Users can export and delete records. Failed recording saves retain a pending in-memory capture for retry.

The overview caps rendered findings, the route table pages at 40 rows and each waterfall shows at most 100 entries. These display limits never change calculations. Large JSON parsing happens in a worker with a 30-second termination timeout. Raw imported text is not posted to the UI or saved to IndexedDB.

## Reproducible verification

Unit tests exercise privacy projection, invalid metrics, schema rejection, cache zeros, normalization, ambiguous/unknown data, threshold conjunctions, failure rates, percentiles, overlap-aware spans, 5,000-route comparisons, atomic storage and listener cleanup.

Playwright tests run the production bundle, scan important views with axe, inspect compact layouts, verify worker import and escaped exports, and load the actual unpacked Manifest V3 extension. The live test opens the real DevTools panel, drives a loopback fixture through two builds, verifies request counts and findings, then checks persisted captures for deliberately seeded secrets.

Playwright omits `devtools://` pages from its normal page collection. The integration driver uses CDP to reach the DevTools target, opens the registered extension panel, and drives its controls. Only that test harness uses DevTools frontend internals; the shipped extension uses documented public extension APIs. Browser frontend changes may require updating the driver.

The fixture reads each response to completion before announcing success. An initial test incorrectly awaited only `fetch()` and exposed the distinction between response headers and completed network requests. This was corrected in the fixture without broadening the extension's capture privileges.

## Deliberate scope

No body inspection, schema drift inference, HTTP replay, page screenshots, WebSocket messages, console logs, Web Vitals, automated journey playback, cloud collaboration or billing are implemented. The product compares network metadata. Expanding any of these would change its permissions, measurement model or data obligations and should have a concrete user need.

The design prioritizes reproducible observations, bounded local processing, explicit uncertainty and independent browser verification.
