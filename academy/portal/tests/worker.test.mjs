import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';

test('production entry point keeps account routes closed when unconfigured',async()=>{
  const env={ASSETS:{fetch:()=>new Response('Development shell')}};
  const status=await worker.fetch(new Request('http://localhost:8787/api/status'),env,{});
  assert.equal((await status.json()).accounts_enabled,false);
  for(const path of ['/api/auth/sign-up/email','/api/auth/sign-in/email','/api/me','/api/catalog']){
    const r=await worker.fetch(new Request('http://localhost:8787'+path),env,{});
    assert.equal(r.status,503,path);
    assert.equal(r.headers.get('cache-control'),'no-store');
  }
});
test('production entry point rejects a wrong host before database or email access',async()=>{
  const env={ACADEMY_ENABLED:'true',ACADEMY_DB:{prepare(){throw new Error('Unexpected database access');}},
    BETTER_AUTH_SECRET:'synthetic-test-only-secret-with-over-32-characters',RESEND_API_KEY:'re_synthetic',
    EMAIL_FROM:'Irenic Academy <learning@courses.irenicconsulting.com>',
    ACADEMY_ORIGIN:'https://learn-staging.irenicconsulting.com'};
  const r=await worker.fetch(new Request('https://attacker.example/api/auth/sign-in/email'),env,{});
  assert.equal(r.status,403);
});
