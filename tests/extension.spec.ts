import { test, expect, chromium } from "@playwright/test";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { DevToolsTarget } from "./devtools-driver";
import type { Capture } from "../src/core/model";

test("installed MV3 extension imports with its CSP and has no host permissions or outbound application calls", async () => {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${resolve("dist")}`,
      `--load-extension=${resolve("dist")}`,
    ],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    const errors: string[] = [];
    const requests: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await page.goto(`chrome-extension://${id}/index.html`);
    await page
      .getByRole("button", { name: "Explore the example", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "5 changes to investigate" }),
    ).toBeVisible();
    await page.getByLabel("Import capture file").setInputFiles({
      name: "extension.har",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          log: {
            entries: [
              {
                request: {
                  method: "GET",
                  url: "https://app.test/api/status?secret=REMOVED",
                },
                response: { status: 200, _transferSize: 123 },
                time: 25,
              },
            ],
          },
        }),
      ),
    });
    await expect(page.getByRole("status")).toContainText("Capture saved");
    await page.getByRole("button", { name: "Capture library" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export extension" }).click();
    const contents = await readFile((await (await download).path())!, "utf8");
    expect(contents).not.toContain("REMOVED");
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("real DevTools capture detects seeded failures, repetition and latency on a local app", async () => {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    viewport: { width: 1600, height: 1050 },
    args: [
      `--disable-extensions-except=${resolve("dist")}`,
      `--load-extension=${resolve("dist")}`,
      "--auto-open-devtools-for-tabs",
    ],
  });
  try {
    const app = context.pages()[0]!;
    await app.goto("http://127.0.0.1:43174");
    const cdp = await context.newCDPSession(app);
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    let targetId = "";
    await expect
      .poll(async () => {
        targetId =
          (await cdp.send("Target.getTargets")).targetInfos.find((t) =>
            t.url.startsWith("devtools://"),
          )?.targetId ?? "";
        return !!targetId;
      })
      .toBe(true);
    const devtools = await DevToolsTarget.attach(cdp, targetId);
    await expect
      .poll(async () =>
        (await cdp.send("Target.getTargets")).targetInfos.some(
          (t) => t.url === `chrome-extension://${id}/devtools.html`,
        ),
      )
      .toBe(true);
    // The shipped entrypoint must register the real panel. This opens that panel, not a substitute page.
    await expect
      .poll(() =>
        devtools.evaluate<boolean>(
          `(async()=>{const UI=await import('./ui/legacy/legacy.js');const view=UI.InspectorView.InspectorView.instance();const tab=view.tabbedPane.tabs.find(t=>t.title==='Traceglass');if(!tab)return false;await view.showPanel(tab.id);return true;})()`,
        ),
      )
      .toBe(true);
    await expect
      .poll(async () => {
        targetId =
          (await cdp.send("Target.getTargets")).targetInfos.find(
            (t) =>
              t.type === "iframe" &&
              t.url === `chrome-extension://${id}/index.html`,
          )?.targetId ?? "";
        return !!targetId;
      })
      .toBe(true);
    const panel = await DevToolsTarget.attach(cdp, targetId);
    await expect.poll(() => panel.text()).toContain("Compare recordings");
    expect(await panel.evaluate("Boolean(chrome.devtools.network)")).toBe(true);
    expect(
      await panel.evaluate(
        `new Promise(resolve=>chrome.devtools.inspectedWindow.eval('location.href',result=>resolve(result)))`,
      ),
    ).toBe("http://127.0.0.1:43174/");
    await app.reload();
    for (const mode of ["baseline", "candidate"]) {
      await app.getByLabel("Build").selectOption(mode);
      await panel.click("New capture");
      await panel.fill("Checkout · release candidate", `Live ${mode}`);
      await panel.fill("Preview · v2.9.0", mode);
      await panel.fill(
        "Cold cache, no throttling, same test account and actions",
        "Local fixture, no-store cache, same checkout actions",
      );
      await panel.click("Start capture");
      await expect.poll(() => panel.text()).toContain("requests captured");
      await app.getByRole("button", { name: "Run checkout journey" }).click();
      await expect(app.locator("#result")).toContainText("Journey complete");
      await expect
        .poll(() => panel.text())
        .toContain(`${mode === "baseline" ? 8 : 17} requests captured`);
      await panel.click("Stop & save capture");
      await expect.poll(() => panel.text()).toContain("Capture saved locally");
    }
    await expect.poll(() => panel.text()).toContain("More failed responses");
    expect(await panel.text()).toContain("Additional repeated calls");
    expect(await panel.text()).toContain("Slower response times");
    const workspace = await context.newPage();
    await workspace.goto(`chrome-extension://${id}/index.html`);
    await expect(
      workspace.getByRole("heading", { name: /changes to investigate/ }),
    ).toBeVisible();
    const captures = await workspace.evaluate(
      () =>
        new Promise<Capture[]>((resolve, reject) => {
          const req = indexedDB.open("traceglass-v1");
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            const get = db
              .transaction("captures", "readonly")
              .objectStore("captures")
              .getAll();
            get.onsuccess = () => {
              resolve(get.result);
              db.close();
            };
          };
        }),
    );
    expect(captures).toHaveLength(2);
    expect(captures.every((c) => c.source === "devtools")).toBe(true);
    expect(JSON.stringify(captures)).not.toContain(
      "FIXTURE_SECRET_MUST_NOT_SURVIVE",
    );
    expect(
      captures
        .find((c) => c.name === "Live candidate")
        ?.requests.some((r) => r.status === 503),
    ).toBe(true);
    await workspace.screenshot({
      path: "artifacts/screenshots/live-capture.png",
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
