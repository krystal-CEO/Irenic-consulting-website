# Irenic Consulting & Wellness Solutions

Website for **irenicconsulting.com**, hosted using Cloudflare Workers Static Assets. Static pages use the actual ICWS tree logo and Consulting contact details.

## Cloudflare setup

Connect this repository to the Worker with these settings:

| Setting | Value |
| --- | --- |
| Project name | `irenic-consulting-website` |
| Production branch | `main` |
| Root directory | Repository root (leave blank) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| Enable preview builds | On |

The project requires Node 22 or newer and Wrangler 4.135.0 or newer for the preview command. Cloudflare installs the package dependencies before building. `wrangler.jsonc` points to the generated `dist` directory. There is no separate output-directory field in the Workers setup screen. No secrets, databases, or paid bindings are required for this version.

After the build succeeds, open the returned Workers URL and check the site. Then add `irenicconsulting.com` and `www.irenicconsulting.com` through the Worker's custom domain settings using your existing Cloudflare account. Preserve email-related MX, SPF, DKIM, and DMARC DNS records. Do not replace the entire DNS zone. Use one canonical hostname and configure the other as a redirect after verifying existing DNS.

## Local validation

```sh
npm run build
npm run check
```

## What currently works

- Responsive home, consulting services, workplace assessments, workshops, collaborative About, Academy coming-soon, contact, and privacy pages, plus custom 404.
- Email and website inquiry-form contact options; no public telephone number.
- Inquiry form validates entries and creates an email draft on the visitor's device. It explicitly tells visitors to send the email; no false submission acknowledgement is displayed.
- Copyable inquiry draft as fallback when an email application is unavailable.
- Canonical URLs, sitemap, robots file, social metadata, and phone-free organization schema.
- Cloudflare Web Analytics beacon supported only when `CLOUDFLARE_WEB_ANALYTICS_TOKEN` is supplied at build time; otherwise no analytics script loads.
- Keyboard navigation, mobile navigation with Escape handling, reduced-motion support, and basic security response headers.

## Lead automation status

The Cloudflare handler and contact-form submission mode are prepared in `automation/`. **Direct submission is disabled until a separate Consulting D1 database, Turnstile keys, internal email notification binding, and explicit enable flag are configured.** Visitors continue to use the email-draft workflow meanwhile. After activation, inquiries are saved in Consulting’s private Cloudflare log, the owner is notified, and visitors see a website confirmation with no automatic acknowledgement email. Consulting uses neither existing Google Workspace nor Apps Script project. See `automation/README.md` for browser setup and the notification availability check. The handler runs only on `/api/*`; static pages remain assets.

The inquiry composer is **not** a server-side submission or automated CRM pipeline. It does not save leads, send acknowledgements, book meetings, or trigger follow-up. Analytics and advertising pixels are not installed. Event hooks contain only an action label and page path, never form entries.

Before replacing the draft workflow with submission, select and connect the approved CRM/delivery destination, implement server-side validation, spam protection and delivery failure handling, update the privacy notice, and verify an actual test lead end to end. A successful response must mean the inquiry was durably accepted. Follow-up, proposals, contracts, and invoices require explicit configured services; do not imply they are active before verification.

Clinical intake data must stay separate from this public business site. Never place API tokens or credentials in browser code or the repository.

## Source

`scripts/build.mjs` generates the page HTML. Styling and browser behavior are in `src/`. `npm run build` uses built-in Node APIs and needs no framework dependencies. Wrangler is used only for Cloudflare deployment.

Logo source: the existing ICWS transparent logo in the user's consulting brand folder, retrieved October 10, 2026. No approval badges or certifications are represented as an active program.

## Consulting marketing and Academy launch readiness (November 5, 2026)

- Public Academy information page is **coming soon**, with no signup, payment, CE approval, certificate, or course delivery. PR #1 remains an isolated draft for the private Academy system; this public page contains no Academy backend code and requires no shared database.
- Organizational assessment page outlines a tailored engagement; it does not promise fixed staffing or a certified/accredited organizational assessment.
- About page presents a collaborative, project-specific delivery model. Do not represent contracted collaborators or a diverse permanent employee roster as already hired. The founder's qualification stays **Ph.D. candidate** pending official conferral.
- No personal portrait is displayed. Consulting continues to accept only email and the inquiry form; production D1 and Resend configuration are unchanged.
- Analytics: to enable free Cloudflare Web Analytics, obtain the website's exact beacon token from Cloudflare, add `CLOUDFLARE_WEB_ANALYTICS_TOKEN` to the build environment, rebuild, and verify telemetry in the Cloudflare dashboard. Leave unset until the property's privacy/consent configuration and production build are reviewed. Event hooks currently emit non-identifying action and path in-browser; no conversion event is transmitted to third parties.
- Google Search Console: verify domain ownership through a non-disruptive method that preserves existing email DNS; submit `https://irenicconsulting.com/sitemap.xml`; monitor indexing and queries. DNS edits and Search Console ownership have **not** been performed by these commits.
- Before production merge: run `npm run build && npm run check` and `node automation/check.mjs`; inspect desktop/mobile page rendering, form submission/Turnstile/email fallback, notification forwarding, CSP with analytics both off and on, sitemap, and 404. The default build has no third-party analytics loaded. Confirm Academy pages do not imply enrollment or CE availability.
- No new recurring subscription, ad pixel, chatbot, blog, photo, public scheduling calendar, or Academy deployment was introduced.
