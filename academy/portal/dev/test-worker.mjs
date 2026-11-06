// Local CI harness only. Not referenced by the production Wrangler config.
// All test addresses must end in @example.invalid. Never sends outbound mail.
import { signJWT } from 'better-auth/crypto';
import { makeAuth } from '../src/auth.mjs';
import { authConfigReady } from '../src/config.mjs';
import { handleAcademyApi } from '../src/api.mjs';

const json = (code,data) => Response.json(data,{status:code,headers:{'cache-control':'no-store'}});
async function captureEmail(env,to,subject,body) {
  if (!/^[a-z0-9._+-]+@example\.invalid$/i.test(to)) throw new Error('synthetic_email_only');
  await env.ACADEMY_DB.prepare('INSERT INTO academy_dev_outbox(id, recipient, subject, body, received_at) VALUES(?,?,?,?,?)')
    .bind(crypto.randomUUID(),to,subject,body,new Date().toISOString()).run();
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if (env.ACADEMY_TEST_ONLY !== 'true' || url.origin !== 'http://127.0.0.1:8787')
      return json(403,{error:'test_environment_only'});
    // Fixed synthetic identity only; unavailable in the production entry point.
    if (request.method==='POST' && url.pathname==='/__test__/expire') {
      if (request.headers.get('origin') !== url.origin) return json(403,{error:'invalid_origin'});
      const {kind,token}=await request.json();
      const email='ci-learner@example.invalid';
      if (kind==='email') return json(200,{token:await signJWT({email},env.BETTER_AUTH_SECRET,-60)});
      const user=await env.ACADEMY_DB.prepare('SELECT id FROM user WHERE email = ?').bind(email).first();
      if (!user) return json(404,{error:'missing_synthetic_user'});
      const past=new Date(Date.now()-60000).toISOString();
      let result;
      if (kind==='session') {
        result=await env.ACADEMY_DB.prepare('UPDATE session SET expiresAt = ? WHERE userId = ?')
          .bind(past,user.id).run();
      } else if (kind==='reset' && typeof token==='string' && token.length<256) {
        result=await env.ACADEMY_DB.prepare('UPDATE verification SET expiresAt = ? WHERE identifier = ? AND value = ?')
          .bind(past,'reset-password:'+token,user.id).run();
      } else return json(400,{error:'invalid_expiry_fixture'});
      return json(200,{changed:result.meta.changes});
    }
    if (request.method==='GET' && url.pathname==='/__test__/outbox') {
      const email=url.searchParams.get('email');
      if(!email || !/^[a-z0-9._+-]+@example\.invalid$/i.test(email))
        return json(400,{error:'invalid_test_address'});
      const messages=await env.ACADEMY_DB.prepare(
        'SELECT id, subject, body FROM academy_dev_outbox WHERE recipient = ? ORDER BY received_at'
      ).bind(email).all();
      return json(200,{messages:messages.results||[]});
    }
    if (url.pathname==='/api/status')
      return json(200,{status:'local-integration-only',accounts_enabled:authConfigReady(env)});
    if(!url.pathname.startsWith('/api/')) return json(404,{error:'not_found'});
    if(!authConfigReady(env)) return json(503,{error:'not_configured'});
    try{
      const auth=makeAuth(env,ctx,captureEmail);
      if(url.pathname.startsWith('/api/auth/'))return auth.handler(request);
      return await handleAcademyApi(request,env,opts=>auth.api.getSession(opts));
    }catch(err){
      // These are synthetic, disposable local test records only.
      console.error('local auth integration failure',err?.message);
      return json(503,{error:'integration_failure'});
    }
  }
};
