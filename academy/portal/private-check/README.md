# Private edge password check

Owner-only synthetic diagnostic, not an Academy authentication server. No bindings, mail, accounts, credentials, or learner data. `fixture.json` is a deliberately public synthetic test vector, not a real password.

Uses the pinned Better Auth 1.7.14 `better-auth/crypto` export and its installed @better-auth/utils 0.5.1 workerd/Node implementation. Parameters unchanged: scrypt N=16384, r=16, p=1, dkLen=64. Bundle with the portal's locked dependencies:

```sh
node_modules/.bin/esbuild private-check/worker.mjs --bundle --format=esm --platform=node --conditions=workerd --outfile=private-check/bundle.mjs
```

The bundle requires `nodejs_compat`. It was loaded only into the existing Access-protected irenic-academy-dev Worker, compatibility date 2026-11-06. Active version prefix observed: 97c7250f. No public deployment or changes to the production portal entry point/configuration. Do not enable previews or attach bindings. Keep both hostname and Worker-level owner-only Access protections.

The entry point also requires trusted `ctx.access`, the exact owner email and exact development origin. POST requires same-origin Origin header. Each form runs just one synthetic operation; no user input is accepted, secrets/hashes are not logged, and all responses with test content use no-store and noindex.

Local validation passed seven scenarios: missing Access, other identity, wrong hostname, valid owner GET, hostile POST origin, hash and verification. These Node checks are not edge performance evidence.

## Execution status

Private test bundle deployed. Browser navigation reached Cloudflare login and then required a fresh authenticator code. Stopped for owner handoff. No hash/verify request has been run on the deployed Worker, so CPU results remain pending. Read actual Cloudflare invocation CPU values; page latency and Date.now are not acceptable substitutes. A successful request alone does not prove a safe margin under free-plan limits.

After successful entry run hash and verify separately; record deployment version, outcome and CPU time from Observability. If either fails or exceeds the budget, retain protections, do not weaken hashing or upgrade automatically. Full application login/logout/cookies and disposable remote recovery are still separate pending checks.
