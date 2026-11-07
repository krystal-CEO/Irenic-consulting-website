import { makeAuth } from './auth.mjs';
import { authConfigReady } from './config.mjs';
import { handleAcademyApi } from './api.mjs';

const result = (status, body) => Response.json(body, {
  status, headers: { 'cache-control':'no-store', 'x-content-type-options':'nosniff' }
});
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (path === '/api/status' && request.method === 'GET')
      return result(200, { status: 'development', accounts_enabled: authConfigReady(env) });
    if (!authConfigReady(env)) return result(503, { error: 'academy_not_configured' });
    if (url.origin !== env.ACADEMY_ORIGIN) return result(403, { error: 'invalid_host' });
    try {
      const auth = makeAuth(env,ctx);
      if (path.startsWith('/api/auth/')) return auth.handler(request);
      return await handleAcademyApi(request,env, data => auth.api.getSession(data));
    } catch {
      return result(503, { error: 'academy_unavailable' });
    }
  }
};
