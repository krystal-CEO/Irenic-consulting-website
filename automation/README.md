# Consulting inquiries — staged, not active

This is prepared source, not a deployed submission system. The live website still prepares an email draft. The handler and form integration are present, but direct submission stays disabled until the Google deployment, required keys, and explicit enable flag are configured. There are no live credentials or Turnstile keys in this repository.

## Result after activation

1. A visitor submits a business inquiry on the Consulting site.
2. Cloudflare validates the request and its Turnstile token.
3. A dedicated Consulting Google Apps Script durably saves the inquiry to its own private Google Sheet. Repeat submission IDs do not create another row.
4. An authorized five-minute timer sends a short acknowledgement to the prospect and a notification directly to the owning Google inbox. Sending directly avoids the forwarding-loop suppression observed during the email test.
5. Krystal reviews the lead, responds, and confirms scope, pricing, proposal, and scheduling.

No automatic calendar booking, quotes, contracts, marketing enrollment, or sales follow-up emails. Status, follow-up date, and notes in the lead log support manual review. This workflow collects business inquiries only, not clinical intake or confidential employee records.

## Google setup (no Terminal commands)

1. In the Google account that should own and send Consulting inquiries, open Google Apps Script and create a NEW project named **Irenic Consulting — Business Inquiries**. Do not replace either existing Therapeutic or Foundation script.
2. Paste the entire `google-apps-script/Code.gs` file into `Code.gs` and save.
3. Select `setupConsultingInquiries` from the function selector and click Run. Complete Google's authorization. This creates a private lead spreadsheet, a random shared secret in Script Properties, and one timer trigger. Re-running setup reuses these resources.
4. In Project Settings → Script Properties, `SHARED_SECRET` is the generated credential, `SHEET_ID` points to the log, and `NOTIFICATION_EMAIL` defaults to the executing Google account's direct inbox. Review that inbox and change it to another approved direct business inbox if needed. Copy the shared secret only into the matching encrypted Cloudflare secret; do not place it in chat, frontend source, or GitHub. Do not change it after copying without updating both ends.
5. Deploy → New deployment → Web app. Execute as **Me**; Who has access: **Anyone**, if permitted by your Workspace administrator. The shared secret authenticates the server-to-server endpoint. Keep the resulting `/exec` URL for the Cloudflare configuration. The script owner remains responsible for quotas and sheet access.

Emails use the executing Google account's authorized sending identity, the business display name, and `replyTo: info@irenicconsulting.com`. A forwarding address alone does not create a Google sending identity. The script does not impersonate the forwarding alias.

## Cloudflare activation prerequisites

1. Create a Managed Turnstile widget in the existing Cloudflare account for `irenicconsulting.com` and `www.irenicconsulting.com`. Include the existing `irenic-consulting-website.krystal-146.workers.dev` hostname only if testing there.
2. In the existing **irenic-consulting-website** Worker, add encrypted secrets `GAS_WEB_APP_URL`, `GAS_SHARED_SECRET`, and `TURNSTILE_SECRET_KEY`. Add the public variable `TURNSTILE_SITE_KEY`. Keep `INQUIRIES_ENABLED` unset until setup and tests are ready.
3. The existing website integration fetches `/api/inquiry-config`, renders Turnstile only in enabled submission mode, validates the form, and sends to the same-origin `/api/inquiries` endpoint. Static pages continue to use the ASSETS binding; only `/api/*` routes invoke the handler. Existing custom domains and redirects are retained.
4. On incomplete setup or challenge loading failure, the contact form stays in its existing email-draft mode. Failed requests retain form contents and offer a retry or direct email. Submission IDs are retained across retry attempts.
5. The updated privacy notice describes both draft mode and direct business submission. No clinical data or employee records should be submitted.
6. Inspect the authenticated Google deployment and private Sheet setup before enabling the form.
7. Enable `INQUIRIES_ENABLED=true` only after the full source integration is ready. Submit one clearly marked business test lead and verify a saved row, prospect acknowledgement, owner notification, duplicate suppression, and failure behavior. Do not test with real confidential employee or clinical information.

## Exceptions and follow-up

The Sheet separately records acknowledgement and notification state. Quota shortages leave rows queued. Failed mail calls are retried up to three attempts. A row stuck at `sending` needs human review; it is not automatically resent because an interrupted execution might already have sent mail. A successful MailApp call is not proof of inbox delivery. Monitor bounces and the log. The script's five-minute queue timer is operational email delivery, not a marketing campaign.

Workspace limits may prevent public web-app deployment or mail sending. If access is blocked, keep the existing email draft workflow and resolve the account settings rather than exposing credentials or weakening account protections.
