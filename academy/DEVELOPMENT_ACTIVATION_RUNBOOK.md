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

## Cloudflare staging handoff — built but not executed

Cloudflare's October 2026 documentation describes **10 D1 databases per Workers Free account**, a total 5 GB D1 storage allowance, and a **10 ms CPU time per Free Worker request**. The connected browser shows `irenicconsulting.com` within the Cloudflare account, but the current Chat browser connector is **read-only**. A tab being open does not confer write access. Account-side actions must be carried out in Work mode (browser control) or by an authorized Cloudflare API/CLI connection.

Before adding anything to the existing Cloudflare account:

1. In **Storage & databases → D1 SQL database**, count existing D1 databases (maximum 10 on Free), inspect current usage and confirm `irenic-academy-dev` does not already exist. Also confirm the existing `irenic-consulting-inquiries` database is intact.
2. Check the account's **Workers plan**; if Free, do not subscribe or upgrade. If there is no D1 capacity or free-tier suitability is uncertain, stop without creating a resource.
3. Create **one** distinct `irenic-academy-dev` database only if Free capacity is available and no duplicate exists. Do not run any SQL migration on the existing Consulting database.
4. Match the Cloudflare account ID and newly issued Academy D1 UUID to the **untracked staging config generator**:
   ```sh
   ACADEMY_CLOUDFLARE_ACCOUNT_ID='<account-id-from-verified-dashboard>' \
   ACADEMY_DEV_D1_ID='<new-academy-d1-uuid>' \
   npm run prepare:staging
   ```
   This writes `academy/portal/wrangler.staging.local.jsonc`. It deliberately sets `workers_dev=false`, publishes **no route**, and sets `ACADEMY_ENABLED=false`. The generator refuses the Consulting D1 ID and known synthetic placeholders. It does **not** call Cloudflare, apply SQL, publish a Worker, modify DNS, create user accounts or incur a charge.
5. **Do not remotely deploy or apply migrations** just because a config exists. First compare the actual Better Auth-generated auth SQL schema and plan the security review; then gate the separate Worker behind an appropriate access control and run controlled CPU tests. No synthetic `@example.invalid` fixtures, outbox endpoints or test secrets may be deployed.
6. For learner email, use a separately verified consulting-owned sender (candidate: Resend Free). Do not change root domain MX or existing Consulting mail forwarding, and do not activate signup until sending and bounce/error monitoring are tested.

Official Cloudflare references:
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/get-started/

**Status:** Staging configuration generator committed and guarded. Cloudflare account-side resource creation is **not confirmed or performed** from this chat.
