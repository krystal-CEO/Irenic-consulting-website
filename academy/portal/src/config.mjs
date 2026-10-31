// Fail closed until explicitly approved Academy-only services exist.
export function authConfigReady(env) {
  if (env.ACADEMY_ENABLED !== 'true' || !env.ACADEMY_DB?.prepare) return false;
  if (typeof env.BETTER_AUTH_SECRET !== 'string' || env.BETTER_AUTH_SECRET.length < 32) return false;
  if (typeof env.RESEND_API_KEY !== 'string' || !env.RESEND_API_KEY.startsWith('re_')) return false;
  if (typeof env.EMAIL_FROM !== 'string' || !/^Irenic Academy <[a-z0-9._+-]+@(?:courses|notifications)\.irenicconsulting\.com>$/.test(env.EMAIL_FROM)) return false;
  try {
    const origin = new URL(env.ACADEMY_ORIGIN);
    const local = origin.origin === 'http://127.0.0.1:8787' || origin.origin === 'http://localhost:8787';
    const allowedRemoteOrigins = new Set([
      'https://learn.irenicconsulting.com',
      'https://learn-staging.irenicconsulting.com'
    ]);
    return origin.origin === env.ACADEMY_ORIGIN &&
      (local || (origin.protocol === 'https:' && allowedRemoteOrigins.has(origin.origin)));
  } catch { return false; }
}
