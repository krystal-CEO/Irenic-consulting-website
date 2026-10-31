# Irenic Academy — development activation runbook

**Status: only isolated local tests have been performed. Do not treat this as approval to deploy.**

## Verified evidence (October 31, 2026)

- [Passing CI run](https://github.com/krystal-CEO/Irenic-consulting-website/actions/runs/41211784436): Node 22, Better Auth 1.7.14, Wrangler 4.156.0, nine synthetic API tests passed, separate local D1 migration/seed passed, real Better Auth signup/verification/cookie sign-in/password reset worked end to end, and the Worker dry-run bundle succeeded.
- Local integration used `wrangler.integration.jsonc`, a **fake** database UUID and only `@example.invalid` users, with mail delivered into a **local test outbox** instead of contacting any real provider.
- The production consulting Worker, its `CONSULTING_DB`, its domain, root email records, live subscriptions, and Stripe were untouched.
- A live Cloudflare Academy database, Resend account, verified sender subdomain and real Academy hostname are **NOT** configured or verified.

## Before provisioning a separate remote development database

1. Confirm the Cloudflare account is the intended account for the **Irenic Consulting & Wellness Solutions LLC** project. Do not accidentally use Foundation databases or existing Therapeutic systems.
2. Confirm that the account can create and use another D1 database on its current plan without changing tiers or requiring a payment method. Review usage limits and the 10 ms Workers Free CPU limit.
3. Choose a distinct database named `irenic-academy-dev`, **not** `irenic-consulting-inquiries`, and keep its UUID out of the production Consulting Wrangler configuration.
4. Create a **separate** Academy Worker and development route on a non-public/guarded subdomain; never expose synthetic test inbox or test harness endpoints, and never point the site's production `main` branch at the Academy Worker.
5. Compare generated Better Auth 1.7.14 schema (including database rate-limit table) to the reviewed migrations before using `wrangler d1 migrations apply --remote`. Test backups and restoration with synthetic data.
6. Add dedicated secret values through Cloudflare's secrets manager, not the repository. Restrict administrator deployment access and have the deployment reviewed.
7. Request a security review and validate login/signup/verification/reset and the Worker Free CPU usage in a gated, non-production environment before public traffic.
8. Only then approve routing, DNS and launch, with a rollback path.

## Local reproducible test commands (do not target remote Cloudflare)

Run from `academy/portal/`:

```sh
npm install --no-audit --no-fund
npm run check
npx wrangler d1 migrations apply ACADEMY_DB --local --config wrangler.integration.jsonc
npx wrangler d1 execute ACADEMY_DB --local --config wrangler.integration.jsonc --file dev/outbox.sql
npx wrangler d1 execute ACADEMY_DB --local --config wrangler.integration.jsonc --file dev/seed-synthetic.sql
npx wrangler dev --local --config wrangler.integration.jsonc --port 8787 --ip 127.0.0.1
```

The GitHub Actions workflow handles these automatically and uses `scripts/auth-smoke.mjs` to exercise the local login flow. Do **not** run `wrangler deploy` or `wrangler d1 migrations apply --remote` from this draft.

## Zero-monthly-fee limits

- Cloudflare D1 and Workers include free allowances, but account suitability, costs and CPU consumption remain unconfirmed for password-based authentication. Better Auth's default scrypt may exceed the Free Worker 10 ms CPU/request limit, even when local tests pass.
- Candidate learner email provider: Resend Free, currently listed at $0/month, 3,000 emails/month and 100/day. A consulting-owned verified sender subdomain must be set up before signup can be enabled. See `EMAIL_SETUP_AND_BUDGET.md`.
- The first Academy version can be trialed locally at no subscription cost. Production monthly cost cannot honestly be promised as $0 without testing under live plan limits and accounting for growth, email, video delivery and maintenance.

## Course-release blockers

Courses, pricing, CE eligibility, tax handling, Stripe ownership, refunds, assessments, evaluation, PDF certificates, board reporting, admin MFA, retention and private file storage remain separate unreleased work. No production feature claims or CE credit advertisements are authorized here.
