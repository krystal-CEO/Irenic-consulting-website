# Consulting inquiries — live on free services

Consulting has its own Cloudflare D1 database and Turnstile widget. Neither Google Workspace, Apps Script, Google Sheets, nor the Foundation donor database is used.

## Verified activation — October 31, 2026

- Production `CONSULTING_DB` uses `irenic-consulting-inquiries` (`3a6778fb-510e-4224-9cc7-4800b7cce7f7`). Its inquiry table and notification index were verified in D1.
- Managed Turnstile is configured for `irenicconsulting.com`. `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` are encrypted production secrets; neither is committed.
- The owner created Resend under `krystal@irenix.org`. Transactional, Marketing, and Team plans were Free, with pay-as-you-go disabled. The transactional allowance displayed 3,000 emails/month and 100/day. No paid plan, trial, card, or overage was added. Cloudflare remains Workers Free.
- `notifications.irenicconsulting.com` is verified and sending is enabled. Receiving and open/click tracking remain off. Only three assigned subdomain authentication records were added: TXT `resend._domainkey.notifications`, CNAME `rsend.notifications`, and CNAME `send.notifications`. All passed public DNS and Resend verification. Root MX/SPF/DKIM and existing Squarespace/Mailgun forwarding records were preserved.
- The production Resend key has **Sending access restricted to `notifications.irenicconsulting.com`**.
- Tracked Wrangler configuration has `INQUIRIES_ENABLED=true`, `NOTIFICATION_PROVIDER=resend`, fixed owner destination `info@irenicconsulting.com`, and sender `inquiries@notifications.irenicconsulting.com`. It includes the five-minute retry trigger `*/5 * * * *`.
- Activation commit `b40ff216b5da14789b688473e7254a4dc9d4b11b` deployed Ready in Cloudflare as version `bad41632`. Subsequent commit `9b59afdbb98fa0c7a852ed7cf8320da3ab0053fc` repaired missing opening option tags in the required service dropdown and added a regression check. The live browser then confirmed all seven selectable services.
- `npm run build`, `npm run check`, and `node automation/check.mjs` passed. After the dropdown repair, build and page checks passed again.

## Live test evidence

A clearly fictional internal inquiry was submitted through the actual production website, including the managed Turnstile flow, on October 31 at 15:19 UTC:

- Test marker: `CONSULTING-LIVE-20261031-A`.
- Website confirmation: “Your inquiry has been received for review.”
- Reference: `da8271fc-860b-4fac-b7c0-5dbb2e02f12a`.
- D1 confirmed the saved row, `notification_state=sent`, `notification_attempts=1`, and no notification error.
- Resend message `01a1928b-3d1b-7b4d-8b7f-7806aee34076` showed **delivered** to `info@irenicconsulting.com`.
- Its sender was Irenic Consulting at the configured notifications subdomain. Reply-to was the fictional visitor `consulting-test@example.com`. The preview contained the submitted details and matching reference.
- Resend showed one owner notification. The implementation sends no visitor acknowledgement.

The Resend delivered event confirms acceptance by the recipient mail server; final forwarding/inbox placement remains unconfirmed. Narrow searches of connected Gmail accounts did not find the test message. The connected browser became unavailable before a mobile/fallback browser check, a final cron-dashboard check, and a completion screenshot could be captured. These checks remain follow-up items; they do not change the observed successful website save and owner notification delivery.

## Operations

Review inquiries through the authenticated Cloudflare D1 console. The clearly labeled internal test row remains as verification evidence. Monitor Resend delivery/bounce logs and free quotas; quota exhaustion must never activate paid usage. The tracked retry trigger was included in the successfully deployed activation configuration. If credentials are unavailable, the public form retains its email-draft fallback.

## Behavior and failures

Requests require the expected host, origin, JSON content, bounded payload, allowed fields, and valid Turnstile hostname/action. SQL uses bound parameters. Acceptance follows D1 fingerprint confirmation. Repeated IDs with identical content do not create another row; changed content under a used ID receives a conflict.

The notification uses a fixed Resend endpoint and a single configured owner inbox. Form inputs cannot choose the sender, recipient, CC, or BCC. The visitor email is reply-to only. No automatic visitor acknowledgement is sent. Secrets and inquiry contents are not logged or returned to the browser.

Provider calls reuse `consulting-inquiry/<inquiry-id>` as the idempotency key. Resend retains keys for 24 hours; durable D1 state is the primary duplicate guard. Explicit HTTP rejections are recorded and retried at most three times. Network failures, 5xx responses, conflicts, malformed success, or missing message IDs remain `sending` for manual review rather than automatic duplicate delivery. Do not blindly reset uncertain rows, especially after the provider's idempotency window expires.

Quota or delivery failures never discard a saved inquiry or activate paid usage. Failed rows after three attempts and stuck `sending` rows need manual follow-up. A provider message ID records service acceptance, not inbox delivery. Check provider logs and bounces.

There is no public record read/list endpoint. Review the lead log in the authenticated Cloudflare dashboard. Collect business needs only, excluding clinical intake, employee medical information, or confidential personnel records. Scope, pricing, proposals, and scheduling stay manual.

## Validation

Run `node automation/check.mjs` with Node SQLite support. Existing Cloudflare transport coverage is preserved. Additional tests cover Resend gating, exact endpoint/authentication, fixed owner/sender, hostile recipient overrides, reply-to, SQL persistence, duplicate suppression, atomic claims, stable idempotency keys, quota/auth rejections, and ambiguous sends.

## Official references

- https://resend.com/pricing
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/api-reference/errors
- https://resend.com/docs/dashboard/domains/introduction
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/turnstile/concepts/domain-management/
