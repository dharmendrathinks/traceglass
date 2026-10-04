# Security policy

Security fixes target the latest released version. Older releases are not maintained separately.

## Report a vulnerability privately

Use [GitHub's private vulnerability reporting form](https://github.com/dharmendrathinks/traceglass/security/advisories/new).
Include the affected version, reproduction steps using synthetic data, expected behavior and likely impact.
Do not post exploit details, credentials or private recordings in a public issue.

Relevant reports include sensitive data retained outside the documented allowlist,
script injection through imported captures or reports, and unbounded processing that bypasses the importer limits.

Hostnames, normalized paths, labels and notes are deliberately retained and can still contain sensitive information.
The [privacy notice](docs/PRIVACY.md) describes that boundary. Traceglass does not claim universal anonymization.

This is an independently maintained project. There is no guaranteed response or remediation time.
