// Submission remains disabled until all credentials and INQUIRIES_ENABLED are configured.
const HOSTS = new Set(['irenicconsulting.com', 'www.irenicconsulting.com', 'irenic-consulting-website.krystal-146.workers.dev']);
const SERVICES = new Set(['Leadership development', 'Workplace mental health', 'Culture & psychological safety', 'Workshops & training', 'Organizational assessment', 'Ongoing consulting', 'Help choosing the right approach']);
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
export function isConfigured(env) {
  return env.INQUIRIES_ENABLED === 'true' && Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.GAS_SHARED_SECRET?.length >= 32 && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.GAS_WEB_APP_URL || ''));
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
export async function handle(request, env, fetcher = fetch) {
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
    const result = await fetcher(env.GAS_WEB_APP_URL, {
      method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...lead, token: env.GAS_SHARED_SECRET }), redirect: 'follow', signal: AbortSignal.timeout(25000)
    });
    const accepted = await result.json();
    if (!result.ok || accepted.status !== 'accepted' || accepted.id !== lead.id) return reply(502, { status: 'delivery_unconfirmed' });
    return reply(200, { status: 'accepted', id: lead.id });
  } catch (_) {
    // No raw payloads, email addresses, tokens, or error details in logs or browser responses.
    return reply(502, { status: 'delivery_unconfirmed' });
  }
}
export default { fetch(request, env) { return handle(request, env); } };
