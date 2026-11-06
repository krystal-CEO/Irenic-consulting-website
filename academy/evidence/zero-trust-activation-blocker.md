# Private testing activation status — November 6, 2026

## Completed with owner approval

Krystal explicitly approved the Zero Trust checkout terms and potential usage charges. Cloudflare confirmed Zero Trust Free active, with a $0/month base price and up to 50 users. No Workers paid upgrade was purchased.

Enabled Authenticator application as an available Access MFA method. Global MFA enforcement and account-wide block-traffic remain OFF. No personal authenticator enrollment or secret was handled.

Krystal confirmed krystal@irenix.org as the owner identity ("sure for now"). Saved the Academy owner only Allow policy and the Irenic Academy development only self-hosted application. Cloudflare displayed Application successfully configured. Reopened the saved application and policy to verify:

- Destination: irenic-academy-dev.krystal-146.workers.dev, all paths, no wildcard.
- Application ID: cdb44231-4e67-403d-bc47-45970b4d4015.
- Policy ID: 64ee7477-dc04-4595-9509-2cb26a60cb97.
- Exactly one Include rule: Emails = krystal@irenix.org. No broad domain, Everyone or Bypass rule.
- Application session: 30 minutes; policy session: same as application.
- Application custom MFA: Authenticator application, one-hour authentication duration.
- Policy MFA override was not enabled.

## Reachability check and limits

Navigated to https://irenic-academy-dev.krystal-146.workers.dev after saving. The page returned "There is nothing here yet", consistent with no deployed Academy Worker. It did not show an Access login challenge. Saved configuration is therefore NOT proof that edge Access enforcement, owner login, MFA enrollment or denial of other identities works. Those remain required before any private test is considered protected.

No Academy Worker was deployed. No existing remote database, DNS, email setting or live website was modified. PR remains draft and unmerged.

## Remaining checks

Verify the workers.dev Access integration and unauthenticated denial in a controlled private test, then owner login and personal MFA enrollment. Do not expose Academy content before protection is proven. Real edge CPU, remote schema/recovery and live HTTPS cookies remain untested. Existing database protection and no-public-deployment restrictions remain in effect.

Prior local readiness CI passed: run 42238298183 for commit 905831a194f88d010da7098441e853dfd7ef8d94. This documentation update does not replace remote testing.
