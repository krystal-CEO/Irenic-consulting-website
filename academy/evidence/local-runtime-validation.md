# Local Cloudflare runtime validation — November 6, 2026

Source: c44b50c9d446f93901b9be6d5b611f22e47a43ec. Node 24.22.1, Wrangler 4.156.0, Better Auth 1.7.14. Existing integration config and auth-smoke.mjs used unchanged. All data synthetic; --local used with separate scratch persistence. No remote database or deployment.

## Results

- Migration: 25 statements succeeded; synthetic seed and email outbox applied.
- Auth smoke: PASS. Signup, unverified login rejection, verification, authenticated session, no automatic paid enrollment, password reset, old-password rejection, new-password login, and old-session revocation succeeded.
- Better Auth-created user timestamps and session expiry were stored as TEXT despite INTEGER declarations. Seeded user dates were INTEGER. No conversion was made. Explicit expired-session enforcement and ordering across mixed representations were not tested.
- Local SQL dump/restore: Python sqlite3 iterdump from the disposable local D1 file into a fresh in-memory database. Identical rows across 15 tables; integrity_check=ok; zero foreign-key violations. This is not evidence for Cloudflare remote recovery.

## Environment limitations

Wrangler initially failed network-interface enumeration (uv_interface_addresses). A scratch-only Node preload supplied loopback metadata. Running server and smoke script in the same shell lifecycle on 127.0.0.1 then passed. Application code was unchanged.

Wrangler export rejected --persist-to before exporting. Used local SQLite dump/restore instead; no remote fallback.

## Remaining gates

Deployed edge CPU usage/free-plan limits; Cloudflare remote recovery; private preview access and deployment authorization. No DNS, email, live consulting, existing remote database, subscription or public deployment changes were made.

## Follow-up: explicit expiry checks — November 6, 2026

Extended the existing local CI smoke script and its test-only Worker. All 11 Academy unit/SQLite checks passed, followed by the real Better Auth/workerd/D1 smoke test:

- A correctly signed email-verification JWT with a past expiry returns 401.
- A working session returns 401 after its synthetic database expiry is moved into the past.
- A fresh password-reset link works before expiry. After expiry, the link redirects with INVALID_TOKEN and no token; direct reset returns 400 / INVALID_TOKEN.
- The unchanged password still signs in after the rejected reset.
- All earlier signup, verification, enrollment isolation, password-reset and revocation checks continue to pass.

The expiry fixture only updates the fixed ci-learner@example.invalid identity, requires the local test flag, localhost origin and matching Origin header, and exists only in dev/test-worker.mjs. The production dry-run bundle passed and was inspected to confirm the expiry route and synthetic integration secret are absent. No production code or migration was changed. CI already invokes the extended smoke script.

A read-only local D1 VALUES query checked ISO text and Unix-millisecond integer dates for 2000-01-01 and 2099-01-01. After normalizing with `CASE WHEN typeof(expiry) = 'integer' THEN expiry / 1000.0 ELSE unixepoch(expiry) END < unixepoch('now')`, both past values returned 1 and both future values returned 0. This does not establish that raw mixed-type sorting is safe. Academy application queries currently do not sort or filter these auth timestamps; any future SQL date query must normalize units/storage explicitly. The expiry smoke test validates Better Auth's actual text-date conversion and rejection path, not every possible legacy date format.

Validation used Node 24.22.1, Better Auth 1.7.14 and Wrangler 4.156.0 with separate disposable local persistence and the previously documented loopback preload. An initial check command was accidentally run from the repository root and failed because the consulting dist directory was absent; it made no changes. The intended Academy check command then passed in academy/portal. No remote operation or public deployment was performed.
