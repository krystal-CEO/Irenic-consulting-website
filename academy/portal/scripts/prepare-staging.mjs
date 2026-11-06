// Generates an UNTRACKED config for a distinct, unrouted Academy staging Worker.
// It does not connect to Cloudflare, create a D1, deploy a Worker, or update DNS.
import { isAbsolute } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const cloudflareAccountId=(process.env.ACADEMY_CLOUDFLARE_ACCOUNT_ID || '').trim().toLowerCase();
const databaseId=(process.env.ACADEMY_DEV_D1_ID || '').trim().toLowerCase();

if(!/^[0-9a-f]{32}$/.test(cloudflareAccountId)){
  throw new Error('Set ACADEMY_CLOUDFLARE_ACCOUNT_ID to the confirmed 32-character consulting Cloudflare account ID');
}
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(databaseId)){
  throw new Error('Set ACADEMY_DEV_D1_ID to the actual new Academy D1 UUID');
}
if(databaseId==='11111111-1111-4111-8111-111111111111' || databaseId==='00000000-0000-0000-0000-000000000000'){
  throw new Error('Rejecting synthetic or placeholder D1 database ID');
}
const consultingConfig=JSON.parse(await readFile(new URL('../../../wrangler.jsonc',import.meta.url),'utf8'));
if((consultingConfig.d1_databases || []).some(binding=>binding.database_id?.toLowerCase()===databaseId)){
  throw new Error('Academy staging cannot point to an existing consulting website D1 database');
}
if(consultingConfig.name==='irenic-academy-dev') throw new Error('Staging Worker name overlaps the consulting Worker');

const staging={
  '$schema':'./node_modules/wrangler/config-schema.json',
  name:'irenic-academy-dev',
  account_id:cloudflareAccountId,
  main:'./src/index.mjs',
  compatibility_date:'2026-10-30',
  compatibility_flags:['nodejs_compat'],
  workers_dev:false,
  preview_urls:false,
  vars:{
    ACADEMY_ENABLED:'false',
    ACADEMY_ORIGIN:'https://learn-staging.irenicconsulting.com'
  },
  assets:{
    directory:'./public',
    binding:'ASSETS',
    run_worker_first:['/api/*']
  },
  d1_databases:[{
    binding:'ACADEMY_DB',
    database_name:'irenic-academy-dev',
    database_id:databaseId,
    migrations_dir:'migrations'
  }]
};

const output=process.env.ACADEMY_STAGING_OUTPUT || new URL('../wrangler.staging.local.jsonc',import.meta.url);
if (typeof output === 'string' && (!isAbsolute(output) || !output.endsWith('.jsonc')))
  throw new Error('Staging output must be an absolute .jsonc path');
await writeFile(output,JSON.stringify(staging,null,2)+'\n',{flag:'wx'});
console.log('Created an untracked, unrouted Academy staging configuration; ACADEMY_ENABLED=false.');
console.log('NO Cloudflare resources were created, no migration was run, and nothing was deployed.');
