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
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
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
