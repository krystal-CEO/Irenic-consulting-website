# Consulting inquiries — free delivery, activation pending

Consulting has its own Cloudflare D1 database and Turnstile widget. Neither Google Workspace, Apps Script, Google Sheets, nor the Foundation donor database is used.

## Verified status — October 31, 2026

- Created `irenic-consulting-inquiries` (`3a6778fb-510e-4224-9cc7-4800b7cce7f7`). Verified the inquiry table and notification index in D1.
- Production `CONSULTING_DB` binding is tracked in Wrangler and confirmed in the dashboard.
- Managed Turnstile widget exists for `irenicconsulting.com`, covering its subdomains. The site key is tracked; `TURNSTILE_SECRET_KEY` is encrypted in production.
- The owner requires no new monthly subscriptions. Cloudflare remains Workers Free. Root mail records and existing Squarespace/Mailgun forwarding are unchanged.
- Resend Free is the selected notification option: published allowance 3,000 emails/month with a 100/day limit. No paid plan, card, or pay-as-you-go option is authorized.
- The integration passed local tests using real SQLite and simulated email-provider responses. A Resend account, verified sending subdomain, restricted API key, retry trigger, and live inbox test are still needed.
- `INQUIRIES_ENABLED=false` preserves the working email-draft form. Source preparation does not establish live delivery.
- Attempted Resend signup navigation was blocked by automatic approval review reporting that the ChatGPT workspace was out of credits. The page was not opened. No Resend account or sending domain was created.

## Remaining activation steps

1. Owner creates a free Resend account using `info@irenicconsulting.com` and accepts its terms. Do not add a card or choose a paid trial/upgrade.
2. Verify `notifications.irenicconsulting.com` as the sending domain. Keep Receiving and open/click tracking off. Add only the exact authentication and bounce records assigned to this subdomain. Preserve root MX, SPF, DKIM, and forwarding records.
3. Create a Sending access API key restricted to that domain. Save it as the encrypted production Worker secret `RESEND_API_KEY`. Never commit it, paste it in chat, or expose it in a public variable.
4. Tracked configuration selects `NOTIFICATION_PROVIDER=resend`, fixed owner destination `info@irenicconsulting.com`, and sender `inquiries@notifications.irenicconsulting.com`. Resend does not require the old `CONSULTING_EMAIL` binding.
5. Once credentials are ready, add `*/5 * * * *` as a Cron Trigger in tracked Wrangler configuration. No retry timer is attached yet.
6. Confirm the account remains Free and pay-as-you-go is off. Enable direct submission for a clearly labeled fictional business test. Verify the saved D1 row, website confirmation, one owner notification, correct reply-to, and no visitor email. Check the form on mobile. Leave direct submission enabled only after the live test passes.

## Behavior and failures

Requests require the expected host, origin, JSON content, bounded payload, allowed fields, and valid Turnstile hostname/action. SQL uses bound parameters. Acceptance follows D1 fingerprint confirmation. Repeated IDs with identical content do not create another row; changed content under a used ID receives a conflict.

The notification uses a fixed Resend endpoint and a single configured owner inbox. Form inputs cannot choose the sender, recipient, CC, or BCC. The visitor email is reply-to only. No automatic visitor acknowledgement is sent. Secrets and inquiry contents are not logged or returned to the browser.

Provider calls reuse `consulting-inquiry/<inquiry-id>` as the idempotency key. Resend retains keys for 24 hours; durable D1 state is the primary duplicate guard. Explicit HTTP rejections are recorded and retried at most three times. Network failures, 5xx responses, conflicts, malformed success, or missing message IDs remain `sending` for manual review rather than automatic duplicate delivery. Do not blindly reset uncertain rows, especially after the provider's idempotency window expires.

Quota or delivery failures never discard a saved inquiry or activate paid usage. Failed rows after three attempts and stuck `sending` rows need manual follow-up. A provider message ID records service acceptance, not inbox delivery. Check provider logs and bounces once activated.

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
