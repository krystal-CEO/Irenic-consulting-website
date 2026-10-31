# Irenic Academy learner portal — isolated development scaffold

**Not a live product.** Development-only code for the consulting company. It does not change the consulting website's production branch, custom domains, inquiry Worker, or databases. Initial course material is a synthetic fixture; CE hours, eligibility, approvals, payment, enrollment and certificates are NOT represented as active.

## What is implemented

- Separate Cloudflare Worker and **separate** local D1 schema; Better Auth integration code for email/password with verification, password reset, session cookie security and database-backed auth rate limiting.
- Fail-closed configuration gate requiring an explicit enable flag, Academy D1, a strong auth secret, a consulting-only verified sender and the exact Academy URL.
- Responsive noindex learner portal interface, sign in/up/recovery and a course dashboard. No fake/demo login backdoor.
- Read-only published course catalog; protected course, lesson and progress endpoints; required text-lesson ordering; idempotent learner acknowledgements; revoked enrollments lose access immediately.
- **No public self-enrollment, admin grants, payments, grading or certificate issuance endpoints.** These remain blocked until separately implemented and tested.
- Unit/integration-style SQLite tests with synthetic learners and negative authorization cases.

## Local verification

From `academy/portal`:

```
npm run check
```

These tests use Node 22's built-in SQLite (experimental in Node 22). They do not require npm dependency installation or external network access. They validate the API and SQL behavior with synthetic sessions, **not Better Auth/Cloudflare end-to-end**.

For actual Worker integration, first install dependencies in a networked environment, confirm the Better Auth package's currently generated D1 SQL schema (including rateLimit) matches or supersedes the local draft, and run a separate local Cloudflare D1 instance:

```
npm install
npx wrangler d1 migrations apply irenic-academy-LOCAL-ONLY --local
npx wrangler d1 execute irenic-academy-LOCAL-ONLY --local --file ./dev/seed-synthetic.sql
npm run dev
```

The example `wrangler.jsonc` contains a **deliberately fake database UUID**, no production route, and an isolated Worker name. It MUST NOT be used to deploy or migrate a real database. Never run `--remote`. `npm run deploy` deliberately exits unsuccessfully.

By default, all auth and learner API routes return service-unavailable until separate service credentials exist and `ACADEMY_ENABLED=true` is configured. The static page is a development preview; no paid customer can enroll. Auth email delivery uses Resend only after a consulting-owned sender domain is explicitly configured and verified. There is no new email account, DNS configuration, subscription or real charge in this branch.

## Before any launch

1. Review and generate compatible auth migrations for a pinned Better Auth version. Install packages and run real Worker+D1 signup, verification, reset, rate-limit and cookie integration tests.
2. Establish Academy-specific Cloudflare deployment, private storage, backups/restoration, monitoring, domain and email sender, all under consulting's approved accounts.
3. Develop payment-led enrollments with verified account and amount, webhook signature/idempotency, refunds and reconciliation; disallow enrollment from browser success callbacks.
4. Add versioned assessments/evaluations, eligibility matrix, admin MFA, exports and server-only certificate issuance, then test with hostile requests and independent review.
5. Publish public Academy catalog and licensing SEO content on the **main** site only after official state/profession approval verification. Mark the current course draft as unapproved.
6. Obtain explicit authorization for all production DNS, email sender, payment enablement, approvals, and release.

## Rollback

The feature branch can be closed or deleted with no effect on `main`. There are no remote resources or live migrations from this scaffold.
