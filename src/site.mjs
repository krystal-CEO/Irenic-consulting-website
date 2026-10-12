import { composeInquiry } from './inquiry.mjs';
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('#main-nav');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('open', open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    toggle.focus();
  }
});
const form = document.querySelector('#inquiry-form');
const draft = document.querySelector('#email-draft');
const draftText = document.querySelector('#draft-text');
const draftLink = document.querySelector('#open-email');
const status = document.querySelector('#draft-status');
const submitButton = form?.querySelector('button[type="submit"]');
const note = document.querySelector('#inquiry-mode-note');
const heading = document.querySelector('#inquiry-heading');
const challenge = document.querySelector('#inquiry-challenge');
const emailInstead = document.querySelector('#email-instead');
let mode = 'draft';
let sending = false;
let submissionId;
let widget;
function useDraftMode() {
  mode = 'draft';
  if (heading) heading.textContent = 'Prepare your inquiry.';
  if (note) note.textContent = 'This form creates an email draft on your device. Review it, then send it through your email app. Nothing is submitted by completing this form.';
  if (submitButton) submitButton.textContent = 'Prepare email draft ↗';
  if (challenge) challenge.hidden = true;
  if (emailInstead) emailInstead.hidden = true;
}
emailInstead?.addEventListener('click', useDraftMode);
async function configureSubmission() {
  if (!form) return;
  try {
    const response = await fetch('/api/inquiry-config', { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return;
    const config = await response.json();
    if (!config.enabled || !config.siteKey) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
    challenge.hidden = false;
    widget = window.turnstile.render(challenge, { sitekey: config.siteKey, action: 'consulting_inquiry', 'error-callback': () => { useDraftMode(); return true; } });
    mode = 'submit';
    heading.textContent = 'Tell us about your organization.';
    note.textContent = 'Send a business inquiry directly to Irenic Consulting. We’ll save it for review. No meeting is booked by submitting this form.';
    submitButton.textContent = 'Send inquiry ↗';
    emailInstead.hidden = false;
  } catch { useDraftMode(); }
}
void configureSubmission();
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending || !form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  if (mode === 'submit') {
    const token = window.turnstile.getResponse(widget);
    if (!token) { status.textContent = 'Please complete the verification before sending.'; return; }
    submissionId ||= crypto.randomUUID();
    sending = true;
    submitButton.disabled = true;
    emailInstead.disabled = true;
    status.textContent = 'Sending your inquiry…';
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, id: submissionId, turnstileToken: token }), signal: AbortSignal.timeout(35000) });
      const saved = await response.json();
      if (response.status === 409) { submissionId = undefined; throw new Error('submission_conflict'); }
      if (!response.ok || saved.status !== 'accepted' || saved.id !== submissionId) throw new Error('unconfirmed');
      status.textContent = `Your inquiry has been received for review. Reference: ${saved.id}`;
      draft.hidden = true;
      form.reset();
      submissionId = undefined;
    } catch (error) {
      if (error.message === 'submission_conflict') {
        status.textContent = 'An earlier version of this inquiry was already received. Review your changes and send again if you want to submit a new inquiry.';
      } else status.textContent = 'We could not confirm receipt. Your inquiry may have been saved. You can retry, or choose “Use email instead” below to contact us directly.';
    } finally {
      sending = false;
      submitButton.disabled = false;
      emailInstead.disabled = false;
      window.turnstile.reset(widget);
    }
    return;
  }
  const result = composeInquiry(data);
  draftText.value = `To: info@irenicconsulting.com\nSubject: ${result.subject}\n\n${result.body}`;
  draftLink.href = result.url;
  draft.hidden = false;
  status.textContent = 'Your email draft is ready. Review it below, then open your email app to send it. It has not been sent.';
  draft.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  draftText.focus();
});
document.querySelector('#copy-draft')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(draftText.value);
    status.textContent = 'Draft copied. Paste it into an email to info@irenicconsulting.com and send when ready.';
  } catch {
    draftText.focus(); draftText.select();
    status.textContent = 'Select and copy the draft, then paste it into your email app.';
  }
});
// Integration hook: no identifying data, destinations, or tracking cookies.
document.querySelectorAll('[data-action]').forEach((link) => {
  link.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('irenic:action', { detail: { action: link.dataset.action, path: window.location.pathname } }));
  });
});
