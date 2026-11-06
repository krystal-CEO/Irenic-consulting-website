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

Explicit expired-session/token enforcement and date comparisons; deployed edge CPU usage/free-plan limits; Cloudflare remote recovery; private preview access and deployment authorization. No DNS, email, live consulting, existing remote database, subscription or public deployment changes were made.
