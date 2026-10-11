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

- Responsive home, service, workshop, about, contact, and privacy pages, plus custom 404.
- Business telephone and email links.
- Inquiry form validates entries and creates an email draft on the visitor's device. It explicitly tells visitors to send the email; no false submission acknowledgement is displayed.
- Copyable inquiry draft as fallback when an email application is unavailable.
- Canonical URLs, sitemap, robots file, social metadata, and organization schema.
- Keyboard navigation, mobile navigation with Escape handling, reduced-motion support, and basic security response headers.

## Lead automation status

The inquiry composer is **not** a server-side submission or automated CRM pipeline. It does not save leads, send acknowledgements, book meetings, or trigger follow-up. Analytics and advertising pixels are not installed. Event hooks contain only an action label and page path, never form entries.

Before replacing the draft workflow with submission, select and connect the approved CRM/delivery destination, implement server-side validation, spam protection and delivery failure handling, update the privacy notice, and verify an actual test lead end to end. A successful response must mean the inquiry was durably accepted. Acknowledgements, follow-up, proposals, contracts, and invoices require explicit configured services; do not imply they are active before verification.

Clinical intake data must stay separate from this public business site. Never place API tokens or credentials in browser code or the repository.

## Source

`scripts/build.mjs` generates the page HTML. Styling and browser behavior are in `src/`. `npm run build` uses built-in Node APIs and needs no framework dependencies. Wrangler is used only for Cloudflare deployment.

Logo source: the existing ICWS transparent logo in the user's consulting brand folder, retrieved October 10, 2026. No approval badges or certifications are represented as an active program.
