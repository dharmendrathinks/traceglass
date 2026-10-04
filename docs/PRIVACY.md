# Traceglass privacy and data handling

Version 0.1.0 · 3 October 2026

Traceglass operates locally in your browser. It has no account system, analytics, advertising, telemetry, cloud backend or AI service. The extension does not send captured data to the developer or to another service.

## What it processes

When you start recording in DevTools, Traceglass receives completed HTTP(S) request metadata from Chrome for the inspected tab. It retains method, origin, normalized path, status, resource category, relative start time, duration, available transfer size and waiting time. It also stores capture names, environments, test conditions, timestamps, quality counters and comparison policies.

An imported HAR is read only after you choose it. It may contain sensitive source data; a local worker projects it into the same limited metadata format. Original headers, cookies, request/response bodies, query values, URL credentials and fragments are not persisted by Traceglass. It never calls the DevTools API to retrieve response bodies.

**Hostnames, normalized paths, capture labels and notes can still identify systems or contain sensitive information.** Normalization cannot recognize every identifier or secret. Do not treat a capture or report as universally anonymized. Chrome's built-in DevTools retains its own data separately.

## Storage, retention and deletion

Saved captures and settings live in IndexedDB within the extension's local browser profile. They are not synced to a cloud account. The library holds at most 40 captures and does not silently evict old captures. Delete individual records in Capture library. Uninstalling the extension removes its local storage. Browser profile cleanup may also remove local data.

Unsaved recording data exists in the panel's memory and is discarded when the dialog or DevTools closes. An unsuccessful save can be retried while the dialog remains open. Export captures if you need portable backups.

## Exports

Exporting creates a local JSON capture, HTML report or Markdown report. You choose whether and where to share it. Reports include retained route metadata and the names, environments and test conditions you entered. Exported files remain on your computer until you remove them; uninstalling the extension does not delete those files.

## Permissions

This build declares a DevTools page and a toolbar action without host permissions or content scripts. It does not use Chrome's debugger permission, modify requests, inject code into websites or run background browsing surveillance. Its only background action opens the local workspace when you click the toolbar icon.

The built extension blocks outgoing fetch/network connections from its own pages with `connect-src 'none'`. This does not block or alter the inspected website's traffic.
