# Private testing activation status — November 6, 2026

## Completed with owner approval

Krystal explicitly approved the checkout terms and potential usage charges after reviewing the $0 Zero Trust activation screen. Accepted the displayed Terms of Service/Privacy Policy and usage-charge authorization, then activated Zero Trust Free. Cloudflare confirmed Purchase complete and the subscription active, with a $0/month base price and up to 50 users. The Cloudflare One account overview now shows Zero Trust Free.

Enabled Authenticator application as an available Access MFA method. Global MFA enforcement remains OFF; account-wide block-traffic remains OFF. This enables a second-factor option without placing the existing websites behind Access. No personal authenticator enrollment or secret was handled.

## Prepared but not saved

Prepared a new self-hosted application for only irenic-academy-dev.krystal-146.workers.dev, named Irenic Academy development only, with a 30-minute application session and custom authenticator-app MFA with a one-hour authentication duration. Draft allow policy: Academy owner only, exact email krystal@irenix.org. No wildcard, whole-domain allow rule, bypass or account-wide access rule.

The owner email/access grant awaits confirmation before Save policy/Create. The browser draft is not evidence that the application or policy exists. No Academy Worker has been deployed or made reachable.

## Remaining checks

After the owner access identity is confirmed and the protection is saved, verify denial and owner authentication/MFA before any reachable private test. Real edge CPU, remote schema/recovery and live HTTPS cookies remain untested. No existing remote database, DNS, email setting or live website was modified. No Workers paid upgrade was purchased.

Prior local readiness CI passed: run 42238298183 for commit 905831a194f88d010da7098441e853dfd7ef8d94.
