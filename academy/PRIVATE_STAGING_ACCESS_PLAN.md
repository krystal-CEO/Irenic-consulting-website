# Academy private staging access plan

Verified November 6, 2026. Plan only; no remote resources or policies were changed.

## Account status

The connected account has Workers Free and an existing workers.dev account subdomain. No Academy Worker exists. Cloudflare's Workers page explicitly says to set up Zero Trust before requiring Access sign-in, and the Access applications page shows onboarding. Access is therefore not ready for Academy staging.

## Correction to the earlier plan

A custom staging DNS record is not mandatory. Cloudflare Access can protect a dedicated Worker's workers.dev hostname, including production and preview traffic. A future private test can therefore preserve the user's prohibition on consulting DNS changes. A URL being obscure, or containing noindex, is not access control.

Primary documentation checked November 6:
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/

## Proposed next stage, not executed

1. Complete Zero Trust onboarding only after the owner handles any required terms/plan approval. No paid plan, subscription purchase, payment details, or upgrade is authorized.
2. Use only a dedicated Academy Worker. Never enable account-wide Access: that could affect the live consulting website and other Workers.
3. Create the Worker with workers_dev=false, preview_urls=false, no routes and accounts disabled. Bind only the separate Academy development D1 after explicit authorization for remote testing. Do not deploy the local test inbox or synthetic-secret test Worker.
4. Protect all traffic to that one Worker with an owner-only Access policy, with MFA and a short session. Confirm the exact owner identity before granting access. Do not infer permission from an email address alone.
5. Only after protection is configured, enable the intended protected URL, set the exact Academy origin (no wildcard), and verify unauthenticated denial and owner access. Keep every alternative route/preview disabled. The current code's origin allowlist will need the chosen exact workers.dev origin before authentication testing.
6. Use only synthetic data. No real mail, payment, enrollment, certificates or learner signup. A dedicated private-test mail adapter would need review; the existing local test-worker.mjs is not deployable staging code.
7. Measure Cloudflare edge CPU for hashing, successful/failed login, verification and reset against the Free 10 ms request limit. Local Node hashing measurements exceed 10 ms and are a risk signal, not an edge verdict. Do not weaken password hashing to fit a plan.
8. Prove recovery on a separately authorized disposable database with synthetic data. A Time Travel page and local dump/restore do not prove remote recovery.

## Safe stop and rollback

The current output is ready for further local development, not public launch or private remote authentication. Leave every remote database, Worker, route, DNS record, email setting and Access policy unchanged until the specific next-stage action is authorized. If a later private access test fails, disable the dedicated Academy URL; do not alter shared policies or existing databases.
