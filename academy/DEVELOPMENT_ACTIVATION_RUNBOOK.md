# Irenic Academy development activation runbook

Status November 6, 2026: local development verified; remote authentication and launch are not approved. See evidence/readiness-review-2026-11-06.md for current findings and limitations.

## Confirmed Cloudflare resources (read-only dashboard review)

- Workers Free: $0, 100,000 requests/day, 10 ms CPU per request.
- D1: 4/10 databases, 90.11 kB/5 GB account storage, 318/5 million rows read today and 0/100,000 rows written today at observation time.
- irenic-academy-dev already exists: dashboard shows 0 tables, 0 queries and 12.29 kB. No duplicate database is needed.
- Academy Time Travel offers a 7-day recovery window. No restore was executed.
- Seven Workers are listed, none for Academy. Zero Trust/Access requires initial setup.
- No live website, existing database, DNS, email, secret, policy, subscription or deployment was changed during this review.

## Reproducible local verification

Run from academy/portal using Node 22 or newer:

```sh
npm ci --no-audit --no-fund
npm run check
npx wrangler d1 migrations apply ACADEMY_DB --local --config wrangler.integration.jsonc
npx wrangler d1 execute ACADEMY_DB --local --config wrangler.integration.jsonc --file dev/outbox.sql
npx wrangler d1 execute ACADEMY_DB --local --config wrangler.integration.jsonc --file dev/seed-synthetic.sql
npx wrangler dev --local --config wrangler.integration.jsonc --port 8787 --ip 127.0.0.1
```

Run node scripts/auth-smoke.mjs against that local server. Use fresh disposable persistence for each smoke run. CI creates its own isolated data, runs the smoke script and performs npm run validate:worker (dry run only). The package lock and npm ci keep the reviewed dependency graph reproducible.

The staging generator takes confirmed Academy account/database IDs and creates an ignored config with both public URL switches disabled, no route and accounts disabled. It refuses to overwrite an existing file. Tests use temporary output paths and cannot delete the user's saved config. Never use the consulting D1 ID.

## Remaining gates

- Zero Trust onboarding and owner-only access for one dedicated Worker; see PRIVATE_STAGING_ACCESS_PLAN.md. Custom DNS is optional, not a prerequisite.
- Actual edge CPU performance. Local Node password hashing/verification takes roughly 74–89 ms, which cannot certify compatibility with Workers Free's 10 ms limit.
- Remote schema application and recovery test on specifically authorized disposable infrastructure. Do not run remote migrations or restore existing databases under current authorization.
- Sender authentication, email delivery/recovery monitoring, deployment secrets and live HTTPS cookie behavior before real users. These have not been enabled.
- Course editorial approval, confirmed duration/CE status, assessments, payments, refunds, certificate rules, admin MFA, retention, private files and launch review remain separate release requirements. CRCP301 Revision 1.1 is the active review package; no CE claim is authorized.

Do not merge or deploy this draft as part of verification. npm run deploy intentionally fails; direct Wrangler deployments are also outside the authorized scope.
