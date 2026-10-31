# Irenic Academy — development activation runbook

**Status: isolated local tests and one empty, separate Cloudflare D1 development database. This is not approval to deploy or launch.**

## Verified local evidence (October 31, 2026)

- [Passing CI run](https://github.com/krystal-CEO/Irenic-consulting-website/actions/runs/41211784436): Node 22, Better Auth 1.7.14, Wrangler 4.156.0, nine synthetic API tests passed, isolated local D1 migration and seed passed, real Better Auth signup/verification/sign-in/password reset worked locally, and the Worker dry-run bundle succeeded.
- Local integration used `wrangler.integration.jsonc`, a fake D1 UUID, only `@example.invalid` users, and a local test outbox. It did not contact Resend.
- A follow-up code change allows only the exact HTTPS production and staging Academy origins; auth still fails closed unless the explicit enable flag, separate D1 binding, auth secret, Resend key, and sender are all present.
- These local results do not establish Cloudflare Free CPU performance or remote Better Auth migration compatibility.

## Cloudflare development resources (October 31, 2026)

- The connected account is on the **Workers Free plan ($0)**. Its D1 page showed 3 of 10 databases and 77.82 kB of 5 GB total storage before creation.
- Created exactly one separate database: `irenic-academy-dev`. Its Cloudflare UUID is kept only in the ignored local staging config, not committed to the repository. It is empty: 0 tables and 0 queries.
- D1 usage now shows 4 of 10 databases. The existing `irenic-consulting-inquiries` database remains separate and unchanged.
- A local `wrangler.staging.local.jsonc` was prepared with `workers_dev=false`, no routes, `ACADEMY_ENABLED=false`, and the new Academy D1 binding.
- No Academy Worker was created or deployed. No remote migration, DNS/routing change, email setup, secret, user account, subscription, or payment was made. The production Consulting site, domain, email records, subscriptions and Stripe remain untouched.
- The app’s fail-closed origin allowlist now includes `https://learn-staging.irenicconsulting.com` as a distinct staging origin. No DNS record or route exists for it.

## Before any remote Worker, migration or public traffic

1. Generate Better Auth 1.7.14’s D1/SQLite schema from the pinned dependency and compare it column-by-column with the committed migration, including database rate limiting. Do not apply migrations remotely until reviewed.
2. Decide the private staging access mechanism and review who can deploy. Do not expose the synthetic test inbox, test Worker, fixtures, or secrets.
3. Validate migration backup and restoration with synthetic data.
4. Add dedicated secrets through Cloudflare’s secrets manager only after sender ownership/verification and the private access gate are in place. Do not put secrets in Git.
5. Test login, verification, reset, cookies, rate limits, and CPU usage under Cloudflare Free’s 10 ms per-request CPU ceiling in a gated non-production environment.
6. Keep the Academy hostname unrouted until the access control, rollback path, and launch review are complete.

## Local reproducible commands (do not target remote Cloudflare)

Run from `academy/portal/`:

```sh
npm install --no-audit --no-fund
npm run check
npx wrangler d1 migrations apply ACADEMY_DB --local --config wrangler.integration.jsonc
npx wrangler d1 execute ACADEMY_DB --local --config wrangler.integration.jsonc --file dev/outbox.sql
npx wrangler d1 execute ACADEMY_DB --local --config wrangler.integration.jsonc --file dev/seed-synthetic.sql
npx wrangler dev --local --config wrangler.integration.jsonc --port 8787 --ip 127.0.0.1
```

The GitHub Actions workflow handles the local checks. Do **not** run `wrangler deploy` or `wrangler d1 migrations apply --remote` from this draft.

## Zero-monthly-fee limits

- Cloudflare D1 and Workers have free allowances, but suitability, total cost, and password-hashing CPU use remain unconfirmed for real learners.
- Candidate learner email provider: Resend Free ($0/month, listed at 3,000 emails/month and 100/day). A consulting-owned sender subdomain must be set up separately before signup can be enabled. See `EMAIL_SETUP_AND_BUDGET.md`.
- Production monthly cost cannot be promised as $0 without live limit tests and accounting for growth, email, video delivery, and maintenance.

## Course-release blockers

Course content and pricing, CE eligibility, tax handling, Stripe ownership, refunds, assessments/evaluations, PDF certificates, board reporting, admin MFA, retention, and private file storage remain unreleased work. No CE approval or credit claims are authorized here.

## Status

The separate empty development D1 exists and a local-only config points to it. No Worker, route, DNS change, email sender, secret, or remote migration is configured.