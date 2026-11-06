# Private testing activation status — November 6, 2026

## Authorized scope

Owner approved Zero Trust Free checkout terms and potential usage charges, confirmed krystal@irenix.org as sole test identity, and approved the private test stage. No public Academy launch, existing database changes, DNS/email changes, paid Workers upgrade or merge authorized.

## Saved protections

Zero Trust Free active ($0/month base, up to 50 users). Global MFA enforcement and account-wide Worker protection remain OFF.

- Hostname application: Irenic Academy development only, cdb44231-4e67-403d-bc47-45970b4d4015; exact irenic-academy-dev.krystal-146.workers.dev, all paths; 30-minute session; custom authenticator MFA, one-hour duration.
- Reusable policy: Academy owner only, 64ee7477-dc04-4595-9509-2cb26a60cb97; exactly one Include Emails rule for krystal@irenix.org, Allow. No domain-wide, Everyone or Bypass rule.
- Policy strengthened before Worker creation: explicit 30-minute session, custom MFA override requiring Authenticator application for one hour. Save confirmed. This policy supersedes longer application session defaults.

## Private placeholder deployment and observed checks

Created only irenic-academy-dev using Cloudflare's Hello World template. Before clicking Deploy selected Protect with Cloudflare Access, All traffic, and existing Academy owner only policy. Worker creation application session selected one hour (minimum offered); reusable policy sets 30 minutes.

Deployment version prefix: 0b778760. Dashboard reports Ready, previews disabled, zero bindings, no custom domains or routes. No Academy source, secrets, mail adapter, learner content or database connection was deployed.

Worker Access tab confirms All traffic, Require login on every URL: production and previews, and exactly Academy owner only / krystal@irenix.org / Allow. Linked Worker Access application: 313e9d45-7b7b-405c-b49c-6aa58b6cc16f. Existing hostname protection also detected; hostname policies take precedence.

Browser navigation to https://irenic-academy-dev.krystal-146.workers.dev now displays Log in to Irenic Academy development only rather than Hello World. Selected the Cloudflare identity provider using the owner's existing browser session. It reached No authentication methods set up with Setup MFA; it did not reach Worker content. This verifies an unauthenticated challenge and that the owner flow currently stops at required MFA enrollment. It does not establish completed MFA or successful post-MFA access.

Left that screen open for owner handoff before generating or entering an authenticator credential. No authenticator secret or recovery code was handled.

## Remaining checks

Owner must enroll their personal authenticator and complete login. Then verify successful access and session behavior, test denial for unauthorized identities without granting any additional identity, and proceed with a reviewed synthetic-only private test build. Password hashing CPU on the actual edge, remote schema/recovery on a disposable test database, and live HTTPS auth cookies remain untested. Hello World's performance is not evidence of Better Auth CPU suitability.

No existing remote database, DNS, email setting or live consulting website was modified. No public deployment; only the Access-protected placeholder exists. PR remains draft and unmerged.

Prior local readiness CI passed: run 42238298183 for code commit 905831a194f88d010da7098441e853dfd7ef8d94. This evidence update does not replace remote tests.

Reference checked: https://developers.cloudflare.com/workers/configuration/cloudflare-access/ (single Worker All traffic protection and hostname precedence).

## MFA enrollment prerequisite fixed

Owner reported Setup MFA led to App Launcher disabled/NoAuth page. Access settings confirmed App Launcher had no associated policy. Created a separate Allow policy, Academy owner launcher enrollment only (ae7acdc5-450b-47b7-b655-aeae93d2ed4b), with exactly Emails = krystal@irenix.org and 30-minute policy session. Attached only to App Launcher, also with 30-minute application session; Cloudflare confirmed Application successfully configured. No MFA override on this enrollment policy; it allows initial authenticated owner enrollment without requiring an authenticator that does not yet exist. The Academy owner only policy and both Academy application protections were not changed.

Reloaded owner's blocked launcher tab; it now displays Secure your account with MFA and Set up authenticator application MFA. Left this screen open for the owner to create their personal credential. Did not click into credential creation or capture any enrollment secret. Enrollment completion remains pending. No live website, database, DNS or email changes.

## Owner enrollment verified

After owner reported completion, browser displayed MFA setup complete. Saved the default device display name; Account page then listed one Authenticator / TOTP device for krystal@irenix.org, created and last used November 6. No secret or OTP was read or entered by the agent.

Navigated to the protected Academy Worker. Access now displays Authenticate your identity with a six-digit TOTP field; Worker content remains inaccessible pending that verification. Left the challenge open for owner entry. Enrollment is confirmed; successful post-MFA Worker access is still pending. This challenge is the application login check, not a request for a second authenticator.
