# Contributing to Traceglass

Bug reports, documentation improvements and focused pull requests are welcome.
For larger changes, open an issue describing the problem and the proposed behavior first.

## Set up

Use Node 22 or newer. Run these commands from the repository root:

```sh
npm ci
npx playwright install chromium
npm run check
```

On Linux, install Chromium's system dependencies with
`npx playwright install --with-deps chromium`.

`npm run dev` starts the workspace UI. For recording, run `npm run build`, load
`dist/` as an unpacked Chrome extension, then open Traceglass in DevTools.
`npm run fixture` starts the synthetic checkout application for manual testing.

## Making changes

- Keep comparison and ingestion code in `src/core/` independent of React and Chrome.
- Preserve local processing, explicit recording, bounded imports and the metadata allowlist.
- Document changes to measurements, normalization or privacy in `docs/ENGINEERING.md` and `docs/PRIVACY.md`.
- Use synthetic data in examples and tests. Never attach customer HARs, credentials, private hostnames or session cookies to issues or pull requests.
- Add regression coverage when fixing a behavioral bug. For visual changes, inspect the first-run screen, comparison and narrow DevTools layouts.
- Run `npm run check` and `npm run package` before submitting. Include the problem, resulting behavior and validation in the PR description.

The browser suite uses ports 43173 and 43174. It deliberately fails if another server already owns those ports. The DevTools test driver uses Chromium frontend internals; browser upgrades may require an update to that test driver.

## License and conduct

Contributions are provided under the repository's [MIT license](LICENSE).
Participate respectfully and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
For vulnerabilities, use the private reporting channel in [SECURITY.md](SECURITY.md).
