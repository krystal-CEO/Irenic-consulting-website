# Academy transactional email — cost-controlled activation plan

Status: **NOT CONNECTED. No Resend account, verified sender, DNS change or API token is represented as existing.**

## Selected candidate: Resend Free

- At verification time (2026-10-31) the public plan stated **$0/month**, **3,000 transactional emails/month**, **100/day**, **3 domains**. Free-plan eligibility and latest terms must be checked when activating.
- Do not use Cloudflare Workers Free's verified-destination-only email mode to send signup/reset messages to arbitrary learners; Cloudflare's arbitrary-recipient sending requires Workers Paid.
- Sender: `Irenic Academy <learning@courses.irenicconsulting.com>`.
- Create/select an account owned by Irenic Consulting & Wellness Solutions LLC; do not use Irenic Therapeutic or Irenix Empowerment billing, workspace, API keys, or domain mail resources.
- Verify the `courses.irenicconsulting.com` **sending subdomain** using **only the exact SPF/DKIM/return-path/verification records provided by the selected provider**. Never infer or hard-code DNS values. Review collisions with existing consulting email and preserve all apex MX/SPF/DKIM/DMARC and mail forwarding. Do not activate inbound receiving for this subdomain unless explicitly needed.
- Review the free-tier sending cap and have a daily quota/failure alert. At the 100/day cap, registration may have to pause gracefully; failed email processing must not silently grant verified access.
- Secrets: `RESEND_API_KEY`, `BETTER_AUTH_SECRET` must be injected through the separate Academy Worker secrets, not committed, printed, sent in chat or reused from another entity.
- Configure `ACADEMY_ORIGIN=https://learn.irenicconsulting.com` only when DNS and routes are approved. `ACADEMY_ENABLED` defaults to false. No production domain routes exist in the current branch.
- Confirm deliverability of signup, resend verification, reset, invalid-email messages, rate limiting, expiry and suppression handling with synthetic accounts. Track bounce/failure exceptions without exposing verification tokens.

## Launch approvals still missing

- Separate Academy Cloudflare Worker and D1 database in the appropriate consulting account, plus documented backup/restore.
- Verified Resend sending domain and account ownership.
- A **free-plan CPU suitability measurement**: Workers Free is limited to 10 ms CPU/request and Better Auth's default scrypt password hashing is deliberately CPU-intensive. Local workerd functional tests cannot establish that this limit will be met in production. If verified logins do not fit, evaluate a low-cost alternative host or an established email-magic-link-first flow rather than weakening password hashing. Do not purchase Workers Paid without authorization.
- Application security review, learner/privacy policies, course credits, manual/approved CE reporting, payment sandbox and independent signoff.

## Official references reviewed

- https://resend.com/pricing
- https://github.com/resend/resend-skills/blob/main/skills/resend/references/domains.md
- https://developers.cloudflare.com/email-service/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://better-auth.com/docs/reference/security

This plan does not approve or trigger an actual email, paid subscription, DNS record, new provider account or live learner signup.
