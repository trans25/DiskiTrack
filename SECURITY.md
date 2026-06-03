# Security Policy

## Supported Versions

The `master` branch is the actively maintained version of DiskiTrack and
receives security updates.

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public issue**.

Instead, report it privately via GitHub's
[private vulnerability reporting](https://github.com/trans25/DiskiTrack/security/advisories/new)
or by contacting the repository owner directly.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce or a proof of concept.
- Any suggested remediation, if known.

You can expect an initial response within a few business days. Once the issue
is confirmed, a fix will be prioritized and you will be notified when it ships.

## Secrets & Configuration

- Never commit real secrets (JWT secrets, database credentials, API keys).
- All secrets live in the deployment environment (Render / Vercel) only.
- `.env` files are git-ignored; only `.env.example` templates are tracked.
- GitHub secret scanning and push protection are enabled to catch accidental
  secret commits.
