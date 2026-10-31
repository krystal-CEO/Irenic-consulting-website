import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authConfigReady } from '../src/config.mjs';
const good={ ACADEMY_ENABLED:'true', ACADEMY_DB:{prepare(){return true;}},
  BETTER_AUTH_SECRET:'x'.repeat(48), RESEND_API_KEY:'re_synthetic_not_real',
  EMAIL_FROM:'Irenic Academy <learning@courses.irenicconsulting.com>',
  ACADEMY_ORIGIN:'https://learn.irenicconsulting.com' };
test('auth is fail-closed until every independent dependency is configured',()=>{
 assert.equal(authConfigReady({}),false);
 for(const key of Object.keys(good)){
   const incomplete={...good};delete incomplete[key];
   assert.equal(authConfigReady(incomplete),false, key+' is required');
 }
 assert.equal(authConfigReady({...good,ACADEMY_ENABLED:'false'}),false);
 assert.equal(authConfigReady({...good,ACADEMY_ORIGIN:'https://attacker.example'}),false);
 assert.equal(authConfigReady({...good,ACADEMY_ORIGIN:'http://learn.irenicconsulting.com'}),false);
 assert.equal(authConfigReady({...good,EMAIL_FROM:'Academy <billing@irenix.org>'}),false);
 assert.equal(authConfigReady(good),true);
 assert.equal(authConfigReady({...good,ACADEMY_ORIGIN:'http://127.0.0.1:8787'}),true);
});
