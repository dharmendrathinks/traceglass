import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const sections = [
  "Traceglass third-party notices",
  "The following packages are bundled into the extension. Their licenses apply to their respective code.",
];
for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path || meta.dev) continue;
  const name = path.split("node_modules/").at(-1);
  const file = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md"]
    .map((f) => resolve(path, f))
    .find(existsSync);
  if (!file)
    throw new Error(`License file missing for production dependency ${name}`);
  sections.push(
    `${name} ${meta.version} (${meta.license || "see below"})\n${readFileSync(file, "utf8")}`,
  );
}
writeFileSync(
  "dist/THIRD_PARTY_NOTICES.txt",
  sections.join("\n\n" + "-".repeat(72) + "\n\n"),
);
writeFileSync("dist/PRIVACY.txt", readFileSync("docs/PRIVACY.md", "utf8"));

writeFileSync("dist/LICENSE.txt", readFileSync("LICENSE", "utf8"));
