import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import {
  saveCapture,
  saveCaptures,
  listCaptures,
  deleteCapture,
  savePolicy,
  loadPolicy,
} from "./store";
import { demoCaptures } from "./demo";
import { DEFAULT_POLICY } from "./model";
it("commits captures and policies, rejects excess capacity and still permits edits/deletions", async () => {
  const [a] = demoCaptures();
  expect(await listCaptures()).toEqual([]);
  expect(await loadPolicy()).toEqual(DEFAULT_POLICY);
  for (let i = 0; i < 40; i++) await saveCapture({ ...a, id: String(i) });
  expect(await listCaptures()).toHaveLength(40);
  await expect(saveCapture({ ...a, id: "overflow" })).rejects.toThrow(
    "40 captures",
  );
  await saveCapture({ ...a, id: "0", name: "Updated" });
  expect((await listCaptures()).find((c) => c.id === "0")?.name).toBe(
    "Updated",
  );
  await deleteCapture("1");
  await expect(
    saveCaptures([
      { ...a, id: "batch-one" },
      { ...a, id: "batch-two" },
    ]),
  ).rejects.toThrow("40 captures");
  expect((await listCaptures()).some((c) => c.id === "batch-one")).toBe(false);
  await saveCapture({ ...a, id: "replacement" });
  expect(await listCaptures()).toHaveLength(40);
  await savePolicy({ ...DEFAULT_POLICY, maxRequests: 250 });
  expect((await loadPolicy()).maxRequests).toBe(250);
  for (const c of await listCaptures()) await deleteCapture(c.id);
  expect(await listCaptures()).toHaveLength(0);
});
