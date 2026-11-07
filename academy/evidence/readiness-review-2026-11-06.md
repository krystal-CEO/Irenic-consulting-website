# Academy readiness review — November 6, 2026

Decision: verified for continued local development. Not certified for remote authentication or learner launch. No deployment, remote migration/restore, subscription, DNS, email or live consulting change was performed.

## Cloudflare account verified read-only

| Check | Observation |
| --- | --- |
| Workers plan | Free, $0; 10 ms CPU/request; 100,000 requests/day |
| D1 capacity | 4/10 databases; 90.11 kB/5 GB total storage |
| D1 daily counters | 318/5 million rows read; 0/100,000 rows written at observation |
| Separate Academy database | irenic-academy-dev exists; dashboard shows 0 tables, 0 queries, 12.29 kB |
| Recovery feature | Academy Time Travel shows a 7-day window; restore was not executed |
| Worker inventory | 7 Workers; no Academy Worker |
| Access readiness | Zero Trust onboarding required; no Academy private-access gate configured |

Observations came from the connected Cloudflare dashboard, not estimates or public pricing alone. The account is shared with other applications; usage can change. No duplicate D1 was created. Other applications' records were not queried.

## Fixes made in this review

- Both workers_dev and preview_urls are explicitly false in the local, integration and generated staging configs.
- Staging generation refuses to overwrite an existing config. Staging tests now write in a temporary directory instead of replacing/deleting the developer's saved config.
- Added a local migration that blocks moving a draft lesson into a published version and reverting a published course to draft to rewrite its identity. The original migration remains unchanged; no remote migration ran.
- Added a package lock and switched Academy CI to npm ci. Install succeeded from the lock; npm audit returned zero known vulnerabilities across production and development dependencies at review time. This is not a guarantee against undisclosed vulnerabilities.
- Corrected the private staging plan: Access can protect a dedicated workers.dev URL without consulting DNS changes. Account-wide Access must not be used because it could affect live sites.

## Verification evidence

- 13 unit/SQLite/production-entry tests passed, including access isolation, lesson order, immutable content, fail-closed configuration, wrong-host rejection, and safe staging generation.
- Both local D1 migrations, outbox setup and synthetic seed succeeded on fresh disposable persistence.
- Actual Better Auth 1.7.14 + Wrangler 4.156.0 local runtime passed signup, verification, password reset, session revocation, explicit expiry and no automatic paid enrollment.
- Extended runtime checks passed HttpOnly/SameSite=Lax cookies, sixth login attempt returning 429, cross-origin sign-out rejection without session mutation, valid sign-out invalidation, and used reset-token rejection. Secure cookies on live HTTPS are not proven by a local HTTP test.
- Production dry-run bundle succeeded (about 321.46 KiB gzip). Local expiry controls, test inbox table and synthetic integration secret are absent from the bundle.
- Deployment guard exits nonzero as intended. No direct Wrangler deployment was run.
- Generated the ignored staging config using the dashboard-confirmed Academy account and database; accounts and both public URL modes remain disabled. Staging tests preserved its checksum.
- Repeated local SQL dump/restore after the new migration and expanded smoke: identical rows across 15 tables, integrity_check=ok, no foreign-key violations. This is local restoration only.
- PR changes remain confined to academy/ and the no-deployment Academy workflow. No consulting application files are modified by this PR.

Local execution used Node 24.22.1 and the loopback preload previously documented in local-runtime-validation.md. CI uses Node 22. GitHub CI status is reported on the PR separately for the resulting commit.

## CPU finding: unresolved, material

A diagnostic using the installed Better Auth hashPassword/verifyPassword and process.cpuUsage measured three local Node trials:

| Trial | Hash CPU ms | Verify CPU ms |
| --- | ---: | ---: |
| 1 | 88.569 | 80.541 |
| 2 | 76.202 | 74.907 |
| 3 | 80.196 | 73.517 |

These are local process measurements, not Cloudflare edge CPU and not an end-to-end load test. They exceed the documented Free 10 ms/request budget and are a strong reason not to promise free-plan password-auth suitability. Only a private edge test can determine the deployed result. Do not weaken password hashing or buy a plan to bypass this gate without a separate decision.

## What still requires a next-stage decision

1. Complete Zero Trust onboarding and confirm the owner identity/MFA policy. Any required terms or plan activation belongs to the owner; no purchase was made.
2. Authorize a dedicated, Access-protected Academy test Worker and explicitly scoped disposable database testing. Configure protection before enabling any reachable URL; no public fallback, shared Access policy, live database, consulting DNS or real email changes.
3. Measure real edge CPU and prove remote migration/recovery under that approved scope. Current empty Academy D1 remains unchanged.
4. Before learners: verify transactional email and recovery monitoring, real HTTPS cookies, course content/duration/CE claims, payment/refund/certificate rules, admin access, retention/private storage and operational controls. Those are release work, not capabilities established by these development tests.

## Primary references checked

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/
