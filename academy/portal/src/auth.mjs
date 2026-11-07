import { betterAuth } from 'better-auth';
import { authConfigReady } from './config.mjs';

// Better Auth owns password hashing, verification tokens, sessions and cookie security.
// Do not invent a custom crypto/password/session layer.
async function sendEmail(env, to, subject, body) {
  // Sender domain authentication and ownership verification are launch prerequisites.
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY,
      'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text: body }),
    signal: AbortSignal.timeout(10000)
  });
  if (!result.ok) throw new Error('academy_email_delivery_unconfirmed');
}
export function makeAuth(env, ctx, sendEmailFn = sendEmail) {
  if (!authConfigReady(env)) throw new Error('academy_auth_not_configured');
  const scheduleEmail = promise => {
    // Failures never grant a session. Add persistent alerts before real signups.
    ctx.waitUntil(promise.catch(() => console.error('Academy transactional email failed')));
  };
  return betterAuth({
    appName: 'Irenic Academy',
    database: env.ACADEMY_DB,
    baseURL: env.ACADEMY_ORIGIN,
    trustedOrigins: [env.ACADEMY_ORIGIN],
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, autoSignIn: false,
      minPasswordLength: 12, maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({user,url}) => scheduleEmail(sendEmailFn(env,user.email,
        'Reset your Irenic Academy password',
        'To reset your password, open this link:\n' + url +
        '\n\nIf you did not request this, ignore the message.'))
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: ({user,url}) => scheduleEmail(sendEmailFn(env,user.email,
        'Verify your Irenic Academy email',
        'Verify your email by opening this link:\n' + url +
        '\n\nIf you did not sign up, ignore the message.'))
    },
    rateLimit: {
      enabled: true, storage: 'database', window: 60, max: 30,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
        '/request-password-reset': { window: 300, max: 3 },
        '/send-verification-email': { window: 300, max: 3 }
      }
    },
    advanced: {
      cookiePrefix: 'irenic_academy',
      // Cloudflare supplies this header at the edge. Never trust arbitrary forwarded-for chains.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      crossSubDomainCookies: { enabled: false },
      backgroundTasks: { handler: p => ctx.waitUntil(p) }
    }
  });
}
