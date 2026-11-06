import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const executable=new URL('../scripts/prepare-staging.mjs',import.meta.url);
const temp=mkdtempSync(join(tmpdir(),'academy-staging-test-'));
const output=join(temp,'staging.jsonc');
after(()=>rmSync(temp,{recursive:true,force:true}));
const rootConfig=JSON.parse(readFileSync(new URL('../../../wrangler.jsonc',import.meta.url),'utf8'));
const env={
  ...process.env,
  ACADEMY_STAGING_OUTPUT:output,
  ACADEMY_CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),
  ACADEMY_DEV_D1_ID:randomUUID()
};
function run(extra={}) {
  return spawnSync(process.execPath,[executable.pathname],{
    env:{...env,...extra},encoding:'utf8'
  });
}
test('staging config uses distinct D1, leaves accounts disabled, and never routes traffic',()=>{
  try{
    const created=run();
    assert.equal(created.status,0,created.stderr);
    const config=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(config.name,'irenic-academy-dev');
    assert.equal(config.account_id,env.ACADEMY_CLOUDFLARE_ACCOUNT_ID);
    assert.equal(config.d1_databases[0].binding,'ACADEMY_DB');
    assert.equal(config.d1_databases[0].database_id,env.ACADEMY_DEV_D1_ID);
    assert.equal(config.vars.ACADEMY_ENABLED,'false');
    assert.equal(config.workers_dev,false);
    assert.equal(config.preview_urls,false);
    const unchanged=readFileSync(output,'utf8');
    assert.notEqual(run().status,0,'Must not overwrite an existing config');
    assert.equal(readFileSync(output,'utf8'),unchanged);
    assert.ok(!('routes' in config));
    assert.ok(!('route' in config));
    assert.ok(!('secrets' in config));
    assert.ok(!('triggers' in config));
  } finally { if(existsSync(output)) unlinkSync(output); }
});
test('staging config rejects production D1 ID and placeholder ID',()=>{
  const prodId=rootConfig.d1_databases[0].database_id;
  const productionAttempt=run({ACADEMY_DEV_D1_ID:prodId});
  assert.notEqual(productionAttempt.status,0);
  assert.match(productionAttempt.stderr,/existing consulting website D1/);
  const placeholderAttempt=run({ACADEMY_DEV_D1_ID:'11111111-1111-4111-8111-111111111111'});
  assert.notEqual(placeholderAttempt.status,0);
  assert.match(placeholderAttempt.stderr,/placeholder D1/);
  const noAccount=run({ACADEMY_CLOUDFLARE_ACCOUNT_ID:''});
  assert.notEqual(noAccount.status,0);
});
