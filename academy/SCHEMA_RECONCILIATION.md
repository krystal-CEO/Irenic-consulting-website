# Better Auth schema reconciliation

Status: pinned CLI generation and local SQLite comparison completed November 6, 2026. Remote D1 validation remains pending.

## Method

Restored the Academy branch and installed `better-auth@1.7.14` and its matching official CLI package `auth@1.7.14` in an isolated scratch directory. The old package name `@better-auth/cli` does not publish version 1.7.14. Node version: 24.22.1.

The generator configuration imports the actual `makeAuth` from `academy/portal/src/auth.mjs`, supplies an empty Node `DatabaseSync(':memory:')` database and synthetic local configuration values, and replaces email delivery with a throwing stub. It uses the actual database-backed rate-limit options and no plugins. No remote binding, credential, email delivery, or deployed Worker is used.

Command: `DO_NOT_TRACK=1 node node_modules/auth/dist/index.mjs generate --config auth.mjs --output generated.sql --yes` from the isolated generator directory. The CLI reported missing tables in the deliberately empty in-memory database, then successfully generated SQL with exit code 0. No migrate command was run.

Generated SQL: [evidence/better-auth-1.7.14-generated.sql](evidence/better-auth-1.7.14-generated.sql). SHA-256: `55995dca64087f9b5a184d60c324be6a7793d4c2b0e169690473a707a0b61e80`.

Executed generated SQL and the existing local migration separately in two disposable in-memory SQLite databases. Compared PRAGMA table_info, foreign_key_list, index_list and index_info for user, session, account, verification and rateLimit. The structured result is [evidence/better-auth-1.7.14-comparison.json](evidence/better-auth-1.7.14-comparison.json). Column tuple values in that report are type, not-null flag, default, primary-key flag.

## Results

All five tables have identical column sets, nullability and primary-key flags. Foreign keys, cascade behavior, index column sets and uniqueness match. No required column or key constraint is missing. The SQL is not textually identical:

- Generated date fields declare DATE; the local migration declares INTEGER. These are different SQLite declared affinities. Runtime date serialization must still be validated with the D1 adapter before remote use.
- Generated rateLimit.lastRequest declares BIGINT; the local migration declares INTEGER. Both have integer affinity in SQLite.
- The migration adds DEFAULT 0 to user.emailVerified; generated SQL has no database default. Both require a non-null integer. The extra default is conservative but is a real schema difference.
- The three nonunique lookup indexes have different names; their columns and uniqueness match.
- The generated account schema has no issuer column.

No migration was changed to hide these differences. The raw generator SQL is evidence only and must not be applied as an additional migration: it would recreate existing auth tables and contains no Academy course tables.

## Remaining gates

This generation used the Node SQLite adapter with the real application options, not a live Cloudflare D1 binding. Validate date round trips, auth lifecycle, backup/restore and CPU behavior in an isolated D1-compatible local environment before deciding remote readiness. Deployment, DNS, email, real learner access and remote migration remain disabled under the user's existing constraints.
