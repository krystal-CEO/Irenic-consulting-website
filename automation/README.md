# Consulting inquiries — Cloudflare only, staged

Consulting does not use either existing Google Workspace, Apps Script project, Google Sheet, or Foundation donor database. The Consulting Google script has been removed from this repository. Do not paste the earlier script into either Workspace.

The website currently stays in email-draft mode. Direct submission requires its own Cloudflare D1 database, Turnstile configuration, internal email notification binding, and an explicit activation flag. No live resources, inboxes, credentials, or billing changes have been configured by this source update.

## After activation

1. A visitor submits an inquiry; Cloudflare validates the request and Turnstile verification.
2. The existing Consulting Worker saves it in the separate `irenic-consulting-inquiries` D1 database.
3. The website confirms receipt only after the database confirms the record.
4. Cloudflare sends a notification to the fixed owner inbox. The visitor receives no automatic email.
5. Krystal reviews the inquiry and responds using the existing Consulting email workflow. Scope, pricing, proposals, and scheduling stay manual.

The API exposes no inquiry list or individual-record read endpoint. Review the log through the signed-in Cloudflare D1 dashboard. No confidential employee records or clinical intake data should be collected here.

## Browser setup — first create the separate log

1. In the existing Cloudflare account, open **Storage & databases → D1 SQL database** (or search the dashboard for **D1**).
2. Select **Create database**, name it **irenic-consulting-inquiries**, and create it.
3. Open this database’s **Console**. Paste the entire `schema.sql` file and select **Execute**. The schema creates a Consulting-only table and preserves any existing rows if run again.
4. Keep the database ID for the repository’s Wrangler configuration. It is an identifier, not a secret. The code uses the binding name **CONSULTING_DB**. Do not select the Foundation database.
5. Before activation, add the real database ID and binding to the tracked Wrangler configuration so subsequent GitHub builds retain it. A dashboard binding alone is not the final source configuration.

## Internal notification prerequisites — check availability before changing email

Cloudflare’s documented Email Service supports sending to verified destination inboxes. It still requires a sender domain onboarded to Email Service. General outbound Email Sending is a beta feature on Workers Paid; sends to verified destinations are documented as free on all plans. This does not establish that the current account can complete sender onboarding without a plan change.

Inspect the existing account’s Email Service options before proceeding. Do not purchase a plan, replace the existing root MX/SPF records, enable apex Email Routing, or use an undocumented workaround as part of this setup. The current Mailgun/Squarespace forwarding for `info@irenicconsulting.com` already works and must be preserved.

If outbound sender onboarding is available without changing root mail routing, use the dedicated sender subdomain **notifications.irenicconsulting.com** and sender **inquiries@notifications.irenicconsulting.com**. Review every proposed DNS record and any billing requirement first. Sending-domain onboarding should affect this subdomain and its bounce/authentication records, rather than replacing root incoming-mail records. If the dashboard requires a paid plan or a root mail migration, stop before applying it and choose a reviewed alternative; keep email-draft mode active meanwhile.

Once supported onboarding is confirmed:

- Verify the approved direct owner inbox as a destination. It may receive Consulting notifications without owning a Consulting Workspace, Apps Script, or spreadsheet.
- Add a restricted **CONSULTING_EMAIL** send binding to the existing Consulting Worker, allowing only that owner destination and the Consulting notification sender. Record the same restriction in Wrangler.
- Set **NOTIFICATION_EMAIL** to that fixed inbox and **NOTIFICATION_FROM** to `inquiries@notifications.irenicconsulting.com`. Form input can only set the reply-to address; it can never choose the notification recipient.
- Configure a five-minute Cron Trigger (`*/5 * * * *`) in the tracked Wrangler configuration after bindings are ready. The Worker implements the scheduled handler already. Until then, no retry timer is attached.

## Turnstile and activation

Create a Managed Turnstile widget for `irenicconsulting.com` and `www.irenicconsulting.com`; include `irenic-consulting-website.krystal-146.workers.dev` only if testing there. In the existing Consulting Worker, set the encrypted secret **TURNSTILE_SECRET_KEY** and public variable **TURNSTILE_SITE_KEY**. Google endpoint/secret variables are not used and should not be added.

Keep **INQUIRIES_ENABLED** unset until the database schema, tracked bindings, notification sender, destination, and cron trigger are ready. Then enable it and submit a clearly labeled fictional business inquiry. Verify the saved row, website confirmation, one owner notification, no visitor email, retries without duplicate rows, and delivery-failure handling. Actual inbox delivery requires this live test; local checks do not establish it.

## Failure behavior and review

Email failures never discard a saved inquiry. Known mail rejections are recorded and retried up to three attempts. An interrupted or uncertain send remains **sending** for manual review instead of being resent automatically. **sent** means the service returned a message ID, not proof of inbox delivery. Monitor notification status, provider logs, and bounces. Failed rows after three attempts and rows stuck at **sending** require owner review.

Submission IDs prevent duplicate records. Reusing an ID with different inquiry content is rejected; the browser allows a new submission after explaining that an earlier version was already received. SQL values use bound parameters. Request limits, same-origin validation, and Turnstile checks remain active. No credentials, inquiry contents, or raw provider errors are logged or returned to the visitor.

## References

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/configuration/send-bindings/
- https://developers.cloudflare.com/email-service/configuration/subdomains/
- https://developers.cloudflare.com/email-service/platform/pricing/
