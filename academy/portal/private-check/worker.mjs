import { hashPassword, verifyPassword } from 'better-auth/crypto';
import fixture from './fixture.json' with { type: 'json' };

const ORIGIN = 'https://irenic-academy-dev.krystal-146.workers.dev';
const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'" };
const page = (message) => new Response(`<!doctype html><title>Academy private performance check</title><h1>Academy private performance check</h1><p>${message}</p><p>Synthetic data only. No database, email, accounts, or courses.</p><form method="post" action="/hash"><button>Test one password hash</button></form><form method="post" action="/verify"><button>Test one password verification</button></form>`, {headers});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.origin !== ORIGIN || !ctx.access) return new Response('Forbidden', {status:403});
    let identity;
    try { identity = await ctx.access.getIdentity(); } catch { return new Response('Forbidden', {status:403}); }
    if (identity?.email !== 'krystal@irenix.org') return new Response('Forbidden', {status:403});
    if (request.method === 'GET' && url.pathname === '/') return page('Ready. Each button performs one operation. CPU time must be read from Cloudflare logs; no browser timing is used.');
    if (request.method !== 'POST' || request.headers.get('Origin') !== ORIGIN) return new Response('Forbidden', {status:403});
    if (!['/hash', '/verify'].includes(url.pathname)) return new Response('Not found', {status:404});
    const operation = url.pathname.slice(1);
    console.log(JSON.stringify({check:'academy-scrypt-1', operation, phase:'start'}));
    try {
      const ok = operation === 'hash'
        ? (await hashPassword(fixture.password)).includes(':')
        : await verifyPassword({hash: fixture.hash, password: fixture.password});
      console.log(JSON.stringify({check:'academy-scrypt-1', operation, phase:'complete', ok}));
      return page(ok ? `${operation} completed. Review Cloudflare CPU time before accepting free-plan suitability.` : `${operation} failed.`);
    } catch {
      console.log(JSON.stringify({check:'academy-scrypt-1', operation, phase:'error'}));
      return new Response('Synthetic hashing operation failed. Review Cloudflare logs.', {status:500,headers});
    }
  }
};
