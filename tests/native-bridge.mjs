import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
await context.addInitScript(()=>{
 window.androidBridge={};window.nativeEvents={};window.nativeCalls=[];
 const methods={Preferences:['keys','get','set','remove'],App:['addListener','removeListener','minimizeApp'],Share:['share'],Haptics:['impact'],CapacitorHttp:['post']};
 window.Capacitor={PluginHeaders:Object.entries(methods).map(([name,methods])=>({name,methods:methods.map(name=>({name,rtype:name==='addListener'?'callback':'promise'}))})),
  nativeCallback:async(plugin,method,options,callback)=>{window.nativeEvents[options.eventName]=callback;return 'listener';},
  nativePromise:async(plugin,method,options={})=>{
   window.nativeCalls.push({plugin,method,options});
   const prefs=JSON.parse(sessionStorage.getItem('native-preferences')||'{}');
   if(plugin==='Preferences') {
    if(method==='keys')return {keys:Object.keys(prefs)};
    if(method==='get')return {value:prefs[options.key]??null};
    if(method==='set')prefs[options.key]=options.value;
    if(method==='remove')delete prefs[options.key];
    sessionStorage.setItem('native-preferences',JSON.stringify(prefs));return {};
   }
   if(plugin==='CapacitorHttp') {const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(options.data)});return {status:r.status,data:await r.json()};}
   if(plugin==='Share'&&window.cancelShare)throw new Error('Share canceled');
   return {};
  }
 };
});
const page=await context.newPage();page.setDefaultTimeout(12000);let errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 for(const [game,help] of Object.entries({harf500:'#dugme-yardim',bagla:'#btnYardim',kesme:'#btnHelp',sehirle:'button[title="Nasıl oynanır"]',baklava:'#helpBtn',tilkile:'#help-btn',arala:'#btnHelp'})) {
  await page.goto(`${base}/${game}/`);await page.locator('body[data-mobile-ready=true]').waitFor();
  await page.waitForFunction(()=>!document.body.classList.contains('api-busy'));await page.waitForTimeout(350);
  await page.locator('#tpPlay').click();
  if(game==='bagla')await page.locator(help).click();
  await page.evaluate(()=>window.nativeEvents.backButton());
  await page.waitForTimeout(250);
  assert.equal(new URL(page.url()).pathname,`/${game}/`,`${game}: back closes help instead of leaving game`);
  await page.evaluate(()=>navigator.share({text:'TrPuzzle test sonucu'}));
  assert.ok(await page.evaluate(()=>nativeCalls.some(c=>c.plugin==='Share'&&c.options.text==='TrPuzzle test sonucu')));
  assert.equal(await page.evaluate(async()=>{window.cancelShare=true;try{await navigator.share({text:'iptal'});return 'resolved'}catch(e){return e.name}}),'AbortError');
  console.log(`PASS ${game}: native back and share bridge`);
 }
 await page.goto(base);await page.locator('body[data-mobile-ready=true]').waitFor();
 await page.evaluate(()=>{
  const prefs=JSON.parse(sessionStorage.getItem('native-preferences')||'{}');
  prefs['trw-'+TrPuzzleClock.key()]=JSON.stringify({done:true});
  sessionStorage.setItem('native-preferences',JSON.stringify(prefs));localStorage.clear();
 });
 await page.reload();await page.locator('.btn-play[data-game="Harfle"]').filter({hasText:'Sonucu Gör'}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS native Preferences restore before home reads progress');
} finally {await browser.close();}
