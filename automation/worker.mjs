// Consulting uses only its own Cloudflare resources. Submission stays disabled until activation.
const HOSTS = new Set(['irenicconsulting.com', 'www.irenicconsulting.com', 'irenic-consulting-website.krystal-146.workers.dev']);
const SERVICES = new Set(['Leadership development', 'Workplace mental health', 'Culture & psychological safety', 'Workshops & training', 'Organizational assessment', 'Ongoing consulting', 'Help choosing the right approach']);
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const emailAddress = value => typeof value === 'string' && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
export function isConfigured(env) {
  return env.INQUIRIES_ENABLED === 'true' && Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.CONSULTING_DB?.prepare && env.CONSULTING_EMAIL?.send && emailAddress(env.NOTIFICATION_EMAIL) && /^inquiries@(?:notifications\.)?irenicconsulting\.com$/.test(env.NOTIFICATION_FROM || ''));
}
export function validateLead(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const limits = { name: 100, email: 254, organization: 160, role: 100, service: 80, size: 40, timeframe: 50, message: 2000 };
  const lead = { id: value.id };
  if (!/^[a-f0-9-]{36}$/i.test(lead.id || '')) return null;
  for (const [key, max] of Object.entries(limits)) {
    if (typeof value[key] !== 'string' || value[key].length > max) return null;
    lead[key] = value[key].trim();
  }
  if (!lead.name || !lead.organization || !lead.message || !SERVICES.has(lead.service)) return null;
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(lead.email)) return null;
  if (/[\r\n]/.test(lead.name + lead.email + lead.organization + lead.role + lead.service)) return null;
  return lead;
}
async function limitedBody(request) {
  if (Number(request.headers.get('content-length') || 0) > 12000) throw new Error('too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12000) { await reader.cancel(); throw new Error('too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function handle(request, env, fetcher = fetch, context) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (!HOSTS.has(url.hostname)) return reply(404, { status: 'not_found' });
  if (request.method === 'GET' && url.pathname === '/api/inquiry-config') {
    return reply(200, { enabled: isConfigured(env), siteKey: isConfigured(env) ? env.TURNSTILE_SITE_KEY : '' });
  }
  if (request.method !== 'POST' || url.pathname !== '/api/inquiries') return reply(404, { status: 'not_found' });
  if (!isConfigured(env)) return reply(503, { status: 'not_configured' });
  if (request.headers.get('origin') !== url.origin) return reply(403, { status: 'invalid_origin' });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { status: 'invalid_content_type' });
  let data;
  try { data = await limitedBody(request); } catch (error) { return reply(error.message === 'too_large' ? 413 : 400, { status: 'invalid_body' }); }
  const lead = validateLead(data);
  if (!lead || typeof data.turnstileToken !== 'string' || data.turnstileToken.length > 2048) return reply(400, { status: 'invalid_inquiry' });
  try {
    const validationResponse = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: data.turnstileToken, remoteip: request.headers.get('cf-connecting-ip') || undefined }),
      signal: AbortSignal.timeout(10000)
    });
    const validation = await validationResponse.json();
    if (!validationResponse.ok || !validation.success || validation.hostname !== url.hostname || validation.action !== 'consulting_inquiry') return reply(400, { status: 'verification_failed' });
    const canonical = JSON.stringify(lead);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const saved = await env.CONSULTING_DB.prepare(`INSERT INTO consulting_inquiries
      (id, received_at, name, email, organization, role, service, team_size, timeframe, goals, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
      .bind(lead.id, new Date().toISOString(), lead.name, lead.email, lead.organization, lead.role, lead.service, lead.size, lead.timeframe, lead.message, fingerprint).run();
    if (!saved.success) throw new Error('save_failed');
    const stored = await env.CONSULTING_DB.prepare('SELECT fingerprint FROM consulting_inquiries WHERE id = ?').bind(lead.id).first();
    if (!stored) throw new Error('save_unconfirmed');
    if (stored.fingerprint !== fingerprint) return reply(409, { status: 'submission_conflict' });
    // The durable row owns notification state; retries cannot send a second accepted email.
    const notification = notifyInquiry(env, lead.id).catch(() => {});
    if (context?.waitUntil) context.waitUntil(notification); else await notification;
    return reply(200, { status: 'accepted', id: lead.id });
  } catch (_) {
    // No raw payloads, email addresses, tokens, or error details in logs or browser responses.
    return reply(502, { status: 'delivery_unconfirmed' });
  }
}
export async function notifyInquiry(env, id) {
  if (!isConfigured(env)) return;
  // Claim once, atomically. Leave interrupted/ambiguous sends in 'sending' for owner review.
  const lead = await env.CONSULTING_DB.prepare(`UPDATE consulting_inquiries
    SET notification_state = 'sending', notification_attempts = notification_attempts + 1
    WHERE id = ? AND notification_state IN ('queued', 'failed') AND notification_attempts < 3
    RETURNING *`).bind(id).first();
  if (!lead) return;
  let sent;
  try {
    sent = await env.CONSULTING_EMAIL.send({
      from: { email: env.NOTIFICATION_FROM, name: 'Irenic Consulting' },
      to: env.NOTIFICATION_EMAIL,
      replyTo: lead.email,
      subject: 'New consulting inquiry — ' + lead.service,
      text: ['A business inquiry was saved.', '', 'Name: ' + lead.name, 'Email: ' + lead.email,
        'Organization: ' + lead.organization, 'Role: ' + lead.role, 'Service: ' + lead.service,
        'Team size: ' + lead.team_size, 'Timeframe: ' + lead.timeframe, '', 'Goals:', lead.goals, '',
        'Reference: ' + lead.id, 'Received: ' + lead.received_at, '',
        'Review the Consulting inquiry log in Cloudflare and respond through info@irenicconsulting.com.',
        'Confirm scope, pricing, and scheduling directly.'].join('\n')
    });
  } catch (error) {
    // Ambiguous service errors are not automatically retried: mail may already have been accepted.
    const knownRejection = new Set(['E_RATE_LIMIT_EXCEEDED', 'E_DAILY_LIMIT_EXCEEDED', 'E_SENDER_NOT_VERIFIED', 'E_SENDER_DOMAIN_NOT_AVAILABLE', 'E_RECIPIENT_NOT_ALLOWED', 'E_RECIPIENT_SUPPRESSED', 'E_VALIDATION_ERROR', 'E_FIELD_MISSING', 'E_DELIVERY_FAILED']);
    const code = knownRejection.has(error?.code) ? error.code : 'unconfirmed';
    await env.CONSULTING_DB.prepare(`UPDATE consulting_inquiries SET notification_state = ?, notification_error = ? WHERE id = ?`)
      .bind(code === 'unconfirmed' ? 'sending' : 'failed', code, id).run();
    return;
  }
  if (!sent?.messageId) return; // No confirmed acceptance; leave for review rather than duplicate mail.
  await env.CONSULTING_DB.prepare(`UPDATE consulting_inquiries SET notification_state = 'sent', notification_message_id = ?, notification_error = NULL WHERE id = ?`)
    .bind(sent.messageId, id).run();
}
export async function processPendingNotifications(env) {
  if (!isConfigured(env)) return;
  const pending = await env.CONSULTING_DB.prepare(`SELECT id FROM consulting_inquiries
    WHERE notification_state IN ('queued', 'failed') AND notification_attempts < 3 ORDER BY received_at LIMIT 25`).all();
  for (const lead of pending.results || []) await notifyInquiry(env, lead.id);
}
export default {
  fetch(request, env, context) { return handle(request, env, fetch, context); },
  scheduled(event, env, context) { context.waitUntil(processPendingNotifications(env).catch(() => {})); }
};
