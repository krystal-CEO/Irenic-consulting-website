# Better Auth D1 schema reconciliation

Status: static source-to-migration review completed; CLI-generated SQL comparison remains a pre-migration gate.

Reviewed against Better Auth v1.7.14 source and the Academy local-only migration `academy/portal/migrations/0001_local_schema.sql` on branch `feature/academy-foundation-2026-10-31`. The configured options use the default user/session/account/verification models, no schema-extending plugins, database-backed rate limiting, and no secondary storage.

## Field and index comparison

| Table | v1.7.14 default fields | Local migration result |
| --- | --- | --- |
| `user` | id, name, email, emailVerified, image, createdAt, updatedAt | All present. Email is unique; emailVerified uses SQLite integer 0/1; date values use integer columns. |
| `session` | id, userId, expiresAt, token, ipAddress, userAgent, createdAt, updatedAt | All present. userId references user(id) with cascade; token is unique; userId index is present. |
| `account` | id, userId, accountId, providerId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt | All present. userId references user(id) with cascade; userId index is present. |
| `verification` | id, identifier, value, expiresAt, createdAt, updatedAt | All present; identifier index is present. |
| `rateLimit` | id, key, count, lastRequest | All present; key is unique. lastRequest is represented by SQLite INTEGER. |

## Findings

- No required default field is missing from the local migration for the inspected v1.7.14 configuration.
- The migration's index names are Academy-specific. The expected unique constraints and lookup indexes are represented; exact generated index naming has not been compared.
- The v1.7.14 default account schema does not require an `issuer` field. Do not add it based on instructions for older Better Auth versions.
- SQLite affinity choices are compatible with the adapter types: text for strings, integer for booleans, dates, numbers, and the rate-limit timestamp.
- This is a structural review of the tagged source, not output from running the installed Better Auth CLI. The local workspace was pruned and the CLI was not installed or run during this review. Before any remote migration, run the CLI for the locked version 1.7.14 in the restored project, capture its generated SQL, compare columns, constraints, foreign keys, and indexes, and update this record with the output hash/review date.
- The Cloudflare D1 database `irenic-academy-dev` remains empty. Do not apply either Academy migration remotely until the CLI-generated schema review and deployment authorization are complete.

## Reviewed files

- Better Auth v1.7.14: `packages/core/src/db/get-tables.ts` and default schema files under `packages/core/src/db/schema/`.
- Academy branch: `academy/portal/src/auth.mjs`, `academy/portal/package.json`, and `academy/portal/migrations/0001_local_schema.sql`.

No production or consulting database was queried or changed for this review.
