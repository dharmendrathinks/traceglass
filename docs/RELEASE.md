# Release process

Traceglass source is MIT licensed. Release archives include the project license, privacy notice and notices for every bundled runtime dependency.

## Validate and package

From the repository root:

```sh
npm ci
npx playwright install chromium
npm run check
npm audit
npm run package
```

`npm run package` checks Manifest V3, the absence of permission declarations, matching package/lockfile/manifest versions, and required assets and notices. It creates:

```text
artifacts/traceglass-VERSION.zip
artifacts/traceglass-VERSION.zip.sha256
dist/                           Load unpacked in Chrome
```

ZIP entries are ordered with fixed timestamps. Only built assets, icons and notices are included. Source, development dependencies, tests, local recordings and environment files are excluded. For an identical toolchain and dependency lock, archive construction is deterministic; builds on different platforms can still produce different bytes.

Verify a downloaded archive with `shasum -a 256 -c traceglass-VERSION.zip.sha256` on macOS, or `sha256sum -c traceglass-VERSION.zip.sha256` on Linux, from the directory containing both files.

## Publish a GitHub release

1. Update the version together in `package.json`, `package-lock.json` and `public/manifest.json`. Update the visible version labels, `CHANGELOG.md`, privacy-notice version and installation links where appropriate.
2. Add release notes in `docs/releases/vVERSION.md`, including installation instructions, changes and material limitations.
3. Run the checks above. Commit and push the intended source to `main`; wait for CI to pass for that exact commit.
4. Create an annotated tag at that tested commit: `git tag -a vVERSION -m 'Traceglass vVERSION'`, then `git push origin vVERSION`.
5. Create the release with `gh release create vVERSION artifacts/traceglass-VERSION.zip artifacts/traceglass-VERSION.zip.sha256 --verify-tag --title 'Traceglass vVERSION' --notes-file docs/releases/vVERSION.md`.
6. Verify the release assets, checksum and the tag's commit. Do not move a published tag; fix errors with a new version.

CI validates main-branch pushes and pull requests on Linux. Its artifacts are build outputs, not automatically published releases. Browser-test screenshots and reports remain ignored local artifacts; `docs/images/` contains selected synthetic screenshots for the README.

## Chrome Web Store

A GitHub release does not publish to the Chrome Web Store. Store distribution needs a registered publisher account, store graphics, accurate data-use declarations, a public privacy-policy URL and Google's review. No store submission is automated by this repository.
