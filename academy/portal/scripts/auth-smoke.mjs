// Real Better Auth + local workerd/D1 smoke test using synthetic .invalid learners.
// Never exercises a deployed hostname, Stripe, Cloudflare account, or Resend API.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787';
const email='ci-learner@example.invalid';
const password='Synthetic-CI-Password-2026!';
const nextPassword='Synthetic-CI-New-Password-2026!';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function req(path,{method='GET',body,cookie,redirect='manual'}={}) {
  const options={method,redirect,headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json',origin:base}:{})}};
  if(body)options.body=JSON.stringify(body);
  const r=await fetch(path.startsWith('http')?path:base+path,options);
  const data=await r.clone().json().catch(()=>null);
  return {status:r.status,data,response:r,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
async function assertStatus(path,status) {
  const result=await req(path);
  assert.equal(result.status,status,path+' did not have expected status');
  return result;
}
async function waitForServer(){
  for(let i=0;i<60;i++){
    try{const r=await req('/api/status');if(r.status===200)return r;}catch{}
    await sleep(500);
  }
  throw new Error('The local Worker did not start');
}
async function outbox(){
  const r=await req('/__test__/outbox?email='+encodeURIComponent(email));
  assert.equal(r.status,200);
  return r.data.messages;
}
async function waitForMessage(term,afterCount=0){
  for(let i=0;i<40;i++){
    const msgs=await outbox();
    const match=msgs.slice(afterCount).find(m=>m.subject.toLowerCase().includes(term));
    if(match)return match;
    await sleep(250);
  }
  throw new Error('Local synthetic message not written: '+term);
}
function urlIn(message){
  const match=message.body.match(/https?:\/\/[^\s]+/);
  assert.ok(match,'No URL included in synthetic mail');
  const u=new URL(match[0]);
  assert.equal(u.origin,base,'A link pointed off the local test server');
  return u.href;
}
const ready=await waitForServer();
assert.equal(ready.data.accounts_enabled,true,'Auth incorrectly disabled in integration mode');
const catalog=await assertStatus('/api/catalog',200);
assert.equal(catalog.data.courses.length,1);
assert.equal((await req('/api/me')).status,401);

const signup=await req('/api/auth/sign-up/email',{method:'POST',body:{name:'CI Learner',email,password}});
assert.ok([200,201].includes(signup.status),'Signup did not succeed: '+signup.status);
const verifyMail=await waitForMessage('verify');
const before=await req('/api/auth/sign-in/email',{method:'POST',body:{email,password}});
assert.notEqual(before.status,200,'Unverified learner was signed in');
const verifyLink=urlIn(verifyMail);
const verified=await req(verifyLink);
assert.ok([200,302,303,307,308].includes(verified.status),'Email verification failed: '+verified.status);
const signed=await req('/api/auth/sign-in/email',{method:'POST',body:{email,password}});
assert.equal(signed.status,200,'Verified learner cannot sign in');
assert.ok(signed.cookie,'Sign-in did not issue a session cookie');
const me=await req('/api/me',{cookie:signed.cookie});
assert.equal(me.status,200,'Cookie-backed Academy session did not work');
assert.equal(me.data.user.email,email);
const courses=await req('/api/my/courses',{cookie:signed.cookie});
assert.equal(courses.status,200);
assert.equal(courses.data.courses.length,0,'Signup improperly gave a paid enrollment');

const beforeReset=(await outbox()).length;
const resetReq=await req('/api/auth/request-password-reset',{method:'POST',body:{
  email,redirectTo:base+'/reset-password.html'
}});
assert.ok([200,202].includes(resetReq.status),'Password reset request failed: '+resetReq.status);
const resetMail=await waitForMessage('reset',beforeReset);
const resetLink=urlIn(resetMail);
const token=new URL(resetLink).searchParams.get('token');
assert.ok(token,'Password reset link had no token');
const reset=await req('/api/auth/reset-password',{method:'POST',body:{newPassword:nextPassword,token}});
assert.equal(reset.status,200,'Password reset endpoint failed: '+reset.status);
const oldLogin=await req('/api/auth/sign-in/email',{method:'POST',body:{email,password}});
assert.notEqual(oldLogin.status,200,'Old password remained valid after password reset');
const newLogin=await req('/api/auth/sign-in/email',{method:'POST',body:{email,password:nextPassword}});
assert.equal(newLogin.status,200,'New password login failed');
const invalidated=await req('/api/me',{cookie:signed.cookie});
assert.equal(invalidated.status,401,'Old session was not revoked after password reset');
console.log('PASS: real Better Auth + local D1 signup, verification, session, enrollment isolation and password reset');
