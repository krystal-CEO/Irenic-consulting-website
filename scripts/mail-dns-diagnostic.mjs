// Public DNS-only diagnostic for Consulting mail routing (no credentials or email payload).
import dns from 'node:dns/promises';
const domain='irenicconsulting.com';
for (const [name,host,fn] of [
  ['MX', domain, () => dns.resolveMx(domain)],
  ['TXT (SPF only)', domain, async()=> (await dns.resolveTxt(domain)).map(parts=>parts.join('')).filter(x=>x.toLowerCase().startsWith('v=spf1'))],
  ['DMARC policy', '_dmarc.'+domain, async()=> (await dns.resolveTxt('_dmarc.'+domain)).map(parts=>parts.join('')).filter(x=>x.toLowerCase().startsWith('v=dmarc1')).map(x=>x.replace(/rua=[^;]+/g,'rua=[redacted]'))],
  ['Email routing CNAME', 'email.'+domain,()=>dns.resolveCname('email.'+domain)]
]) {
try { console.log(name+' '+host+': '+JSON.stringify(await fn())); }
catch(e) { console.log(name+': '+e.code); }
}
