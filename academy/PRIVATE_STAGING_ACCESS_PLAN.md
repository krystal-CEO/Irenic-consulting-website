# Academy private staging access plan

Status: design documented; no Worker deployed and no DNS or Access policy changed.

## Current safe state

- Academy uses a separate empty D1 database named `irenic-academy-dev`.
- The local staging Wrangler config sets `workers_dev=false`, has no route, and sets `ACADEMY_ENABLED=false`.
- There is no deployed Academy Worker, staging hostname, Cloudflare Access application, or active user account.
- The live consulting website, existing database, DNS, and email settings remain outside this setup.

## Required design before any preview

1. **Dedicated hostname:** Select a staging hostname owned by Irenic Consulting. Do not reuse the live consulting website hostname. Creating the DNS record is a separate change and requires explicit authorization; until then, do not deploy a preview.
2. **Access gate before Worker route:** Configure Cloudflare Access for the exact staging hostname before attaching a Worker route. Default policy is deny. Allow only the owner identity selected by Krystal; add another person only after Krystal explicitly approves the identity.
3. **Strong sign-in:** Require MFA for every permitted identity. Keep the session duration short enough for development review and require re-authentication after expiration.
4. **No public fallbacks:** Keep Workers.dev and preview URLs disabled. Do not create a public route or rely on an unlisted URL as access control.
5. **Application gate:** Keep `ACADEMY_ENABLED=false` until access protection, origin allowlisting, independent D1 binding, and test-only content are verified. Never set it true on an unprotected route.
6. **Data and account restrictions:** Use synthetic accounts and fictional course records only. Keep email delivery, payments, enrollment, certificate issuance, and public sign-up disabled.
7. **Secrets and identity:** Store secrets only in the dedicated Worker environment after authorization. Do not copy consulting secrets, mail credentials, database bindings, or live environment variables.
8. **Review and rollback:** Check Access denial and allowed-owner paths, origin restrictions, and logs before any limited preview. If a gate fails, disable the Worker route and leave the D1 database intact and empty.

## Explicit stop condition

A private preview cannot be safely reachable while there is no protected staging hostname. Because this task excludes DNS changes, the current deployment must remain local-only. A future request to enable preview must specify/authorize the staging hostname and its DNS record first; that approval is separate from merging this draft PR.

This document is a plan, not evidence that Cloudflare Access or a staging deployment has been configured.
