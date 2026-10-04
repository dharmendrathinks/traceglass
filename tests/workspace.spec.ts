import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";
import { demoCaptures } from "../src/core/demo";

test("first-run experience, demo analysis, route investigation, waterfall and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Compare recordings" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore the example", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "5 changes to investigate" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /More failed responses/ }).click();
  await expect(
    page.getByRole("complementary", { name: "Route details" }),
  ).toContainText("503");
  await page.getByRole("tab", { name: /All routes/ }).click();
  await page.getByRole("textbox", { name: "Search routes" }).fill("projects");
  await expect(page.getByRole("table").first()).toContainText("/api/projects");
  await expect(page.getByRole("table").first()).not.toContainText(
    "/api/notifications",
  );
  await page.getByRole("tab", { name: /All routes/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Waterfall" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Waterfall" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Journey timelines" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "5 changes to investigate" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("policies recalculate findings and persist; captures can be edited, exported and deleted", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the example", exact: true })
    .click();
  await page.getByRole("button", { name: "Policies & budgets" }).click();
  await page.getByLabel("Median latency increase").fill("2000");
  await page.getByRole("button", { name: "Save policy" }).click();
  await page.getByRole("button", { name: "Comparison", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "3 changes to investigate" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit candidate details" }).click();
  await page
    .getByLabel("Name", { exact: true })
    .fill("Release candidate edited");
  await page.getByRole("button", { name: "Save details" }).click();
  await page.getByRole("button", { name: /Capture library/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Release candidate edited",
      exact: true,
    }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Release candidate edited" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("traceglass-capture.json");
  await page
    .getByRole("button", { name: "Delete Release candidate edited" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Release candidate edited",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Policies & budgets" }).click();
  await expect(page.getByLabel("Median latency increase")).toHaveValue("2000");
});

test("worker imports sanitized captures; invalid files do not corrupt saved data", async ({
  page,
}) => {
  await page.goto("/");
  const har = {
    log: {
      entries: [
        {
          request: {
            method: "POST",
            url: "https://user:SECRET@app.test/api/accounts/123?token=SECRET",
            postData: { text: "SECRET" },
          },
          response: {
            status: 503,
            _transferSize: 0,
            content: { text: "SECRET" },
          },
          time: 300,
          startedDateTime: "2026-10-03T10:00:00Z",
        },
      ],
    },
  };
  await page.getByLabel("Import capture file").setInputFiles({
    name: "real-capture.har",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(har)),
  });
  await expect(page.getByRole("status")).toContainText("Capture saved locally");
  await page.getByRole("button", { name: /Capture library/ }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export real-capture" }).click();
  const path = await (await downloading).path();
  const data = await readFile(path!, "utf8");
  expect(data).not.toContain("SECRET");
  expect(data).toContain("/api/accounts/:id");
  await page.getByLabel("Import capture file").setInputFiles({
    name: "broken.har",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await expect(page.getByRole("alert")).toContainText("Invalid JSON");
  await expect(
    page.getByRole("heading", { name: "real-capture", exact: true }),
  ).toBeVisible();
});

test("HTML and Markdown reports are portable and escape untrusted text", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: /HTML report/ }).click();
  const download = await downloading;
  const path = await download.path();
  const html = await readFile(path!, "utf8");
  expect(html).toContain("503");
  expect(html).toContain("Synthetic demonstration");
  expect(html).toContain("Interpretation");
  const report = await browser.newPage();
  await report.setContent(html);
  await expect(
    report.getByRole("heading", { name: "What changed" }),
  ).toBeVisible();
  await report.close();
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  const mdDownloading = page.waitForEvent("download");
  await page.getByRole("button", { name: /Markdown report/ }).click();
  expect((await mdDownloading).suggestedFilename()).toBe(
    "traceglass-report.md",
  );
});

test("accessible main views and responsive layout; save real screenshots", async ({
  page,
}) => {
  await page.goto("/");
  const scan = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  await scan();
  await mkdir("artifacts/screenshots", { recursive: true });
  await page.screenshot({
    path: "artifacts/screenshots/welcome.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Explore the example", exact: true })
    .click();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await scan();
  await page.screenshot({
    path: "artifacts/screenshots/comparison.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /More failed responses/ }).click();
  await scan();
  await page.screenshot({
    path: "artifacts/screenshots/investigation.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Policies & budgets" }).click();
  await scan();
  await page.getByRole("button", { name: "Comparison", exact: true }).click();
  for (const width of [900, 560, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await scan();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "New capture" }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/${width === 560 ? "compact" : `compact-${width}`}.png`,
      fullPage: true,
    });
  }
});

test("capture guidance in workspace and a recoverable same-capture comparison", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New capture" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Start inside Chrome DevTools",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const [capture] = demoCaptures();
  await page.getByLabel("Import capture file").setInputFiles({
    name: "saved.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(capture)),
  });
  await expect(page.getByRole("status")).toContainText("Capture saved");
  const id = await page.getByLabel("Baseline capture").inputValue();
  await page.getByLabel("Candidate capture").selectOption(id);
  await expect(
    page.getByRole("heading", { name: "Choose two different captures." }),
  ).toBeVisible();
});
