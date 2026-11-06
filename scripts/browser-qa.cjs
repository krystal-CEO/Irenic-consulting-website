// Visual and responsive browser QA without submitting the form or processing real data.
// Invoked in GitHub CI with a temporary Playwright package and system Chrome.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const { chromium }=require('playwright');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome/Chromium is required for UI QA');
const origin='https://irenicconsulting.com';
const pages=['/','/services/','/workshops/','/about/','/contact/','/privacy/','/academy/','/organizational-assessments/'];
const viewports=[{width:320,height:760},{width:390,height:844},{width:768,height:900},{width:1440,height:900}];
const errors=[];
async function run(){
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
try {
for(const size of viewports) {
 const context=await browser.newContext({viewport:size,deviceScaleFactor:1,ignoreHTTPSErrors:false});
 const page=await context.newPage();
 for(const route of pages) {
  try{
   const response=await page.goto(origin+route+'?responsive_qa=20261106',{waitUntil:'domcontentloaded',timeout:25000});
   assert.equal(response.status(),200,route+' not 200');
   await page.locator('h1').waitFor({state:'visible',timeout:6000});
   const m=await page.evaluate(()=>({w:window.innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,phone:!!document.querySelector('a[href^="tel:"]')}));
   assert.ok(m.scroll<=m.w+4,route+' at '+size.width+' has horizontal overflow: '+JSON.stringify(m));
   assert.ok(!m.phone,'Public phone link remains');
   if(route==='/contact/') {
     assert.equal(await page.locator('input[name="phone"]').count(),0);
     assert.equal(await page.locator('#inquiry-form').count(),1);
     assert.equal(await page.locator('input[type=email][required]').count(),1);
   }
   if(route==='/academy/') assert.match(await page.locator('body').innerText(),/Course enrollment is not open/);
   if(route==='/' && size.width<760){
     const toggle=page.locator('[data-menu-toggle]');
     assert.equal(await toggle.isVisible(),true,'Mobile menu hidden');
     await toggle.click();
     assert.equal(await toggle.getAttribute('aria-expanded'),'true');
     assert.equal(await page.locator('.main-nav a[href="/academy/"]').isVisible(),true,'Academy missing from mobile nav');
     await page.keyboard.press('Escape');
     assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   }
   console.log('PASS responsive',size.width,route);
  }catch(e){errors.push(size.width+' '+route+': '+e.message);console.error('FAIL responsive',size.width,route,e.message);}
 }
 await context.close();
}
} finally {await browser.close();}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log('Responsive smoke passed at 320, 390, 768, 1440 px. Does not submit inquiries.');

}
run().catch(e=>{console.error(e);process.exitCode=1;});
