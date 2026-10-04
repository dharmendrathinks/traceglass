import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
const root = resolve("dist");
const entries = {};
async function walk(dir) {
  for (const item of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await walk(path);
    else
      entries[relative(root, path).replaceAll("\\", "/")] = [
        new Uint8Array(await readFile(path)),
        { mtime: new Date("1980-01-01T00:00:00Z") },
      ];
  }
}
await walk(root);
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
);
if (
  manifest.manifest_version !== 3 ||
  manifest.host_permissions ||
  manifest.permissions
)
  throw new Error(
    "Unexpected extension permissions. Inspect the manifest before packaging.",
  );
const metadata = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
if (
  manifest.version !== metadata.version ||
  manifest.version !== lock.version ||
  manifest.version !== lock.packages[""].version
)
  throw new Error("Package, lockfile and manifest versions must match.");
for (const path of [
  "LICENSE.txt",
  "THIRD_PARTY_NOTICES.txt",
  "PRIVACY.txt",
  manifest.devtools_page,
  manifest.background.service_worker,
  ...Object.values(manifest.icons),
])
  if (!entries[path]) throw new Error(`Missing packaged file ${path}`);
const data = zipSync(entries, { level: 9 });
await mkdir("artifacts", { recursive: true });
const name = `traceglass-${manifest.version}.zip`;
await writeFile(`artifacts/${name}`, data);
const hash = createHash("sha256").update(data).digest("hex");
await writeFile(`artifacts/${name}.sha256`, `${hash}  ${name}\n`);
console.log(
  `${name}: ${data.length.toLocaleString()} bytes, ${Object.keys(entries).length} files\nSHA-256 ${hash}`,
);
