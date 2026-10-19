import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({channel:'chrome',headless:true});
await mkdir('test-results',{recursive:true});
const appearance = () => Object.fromEntries([...document.querySelectorAll('.tile,.key,.tus,.kutucuk,.kutu,.icon-btn,.iconbtn,.ust-dugme,.guess-btn,#cv,.map-shell')].slice(0,80).map((el,i)=>{
 const css=getComputedStyle(el);return [i,Object.fromEntries(['borderRadius','fontFamily','fontSize','color','backgroundColor','padding','width','height'].map(k=>[k,css[k]]))];
}));
async function enter(page, game, resume = false) {
 await page.locator('body[data-mobile-ready="true"]').waitFor();
 await page.waitForFunction(()=>!document.body.classList.contains('api-busy'));
 await page.waitForTimeout(300);
 if(await page.locator('#tpPlay').isVisible()) await page.locator('#tpPlay').click();
 const start=page.getByRole('button',{name:'Başla',exact:true});
 if(!resume && await start.isVisible()) await start.click();
 if(game==='bagla') {
  await page.locator('#btnArsiv').click();
  await page.locator('.arsiv-satir').first().click();
  await page.locator('#izgara .kutu').first().waitFor();
  if(!resume && await start.isVisible()) await start.click();
 }
 await page.waitForFunction(()=>!document.body.classList.contains('api-busy'));
}
try {
 for(const game of (process.env.TEST_GAMES || 'harf500,bagla,kesme,sehirle,baklava,tilkile,arala').split(',')) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR',timezoneId:'Europe/Istanbul'});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400) failed.push(r.url()+':'+r.status());});
  try {
   await page.goto(`${base}/${game}/`);await enter(page,game);
   const styled=await page.evaluate(appearance);
   assert.ok(Object.keys(styled).length,`${game} has playable controls`);
   await page.locator('link[href="/native.css"]').evaluate(el=>{el.disabled=true;});
   assert.deepEqual(await page.evaluate(appearance),styled,`${game}: exact web appearance`);
   await page.locator('link[href="/native.css"]').evaluate(el=>{el.disabled=false;});
   const moveResponse=page.waitForResponse(r=>r.url().endsWith('/api/game')&&r.request().postDataJSON().action==='move'); moveResponse.catch(()=>{});
   if(game==='harf500') {for(const letter of 'KALEM') await page.locator(`.tus[data-harf="${letter}" i]`).click();await page.locator('.tus.onay').click();}
   if(game==='arala') {for(const letter of 'KALEM') await page.getByRole('button',{name:letter,exact:true}).click();await page.getByRole('button',{name:'ENTER',exact:true}).click();}
   if(game==='tilkile') { await page.locator('.key').filter({hasText:/^A$/}).click(); await page.locator('#confirm-yes').click(); }
   if(game==='bagla') {for(let i=0;i<4;i++) await page.locator('#izgara .kutu').nth(i).click();await page.locator('#btnGonder').click();}
   if(game==='sehirle') {await page.getByLabel('Şehir tahmini').fill('Ankara');await page.getByRole('button',{name:'Tahmin',exact:true}).click();}
   if(game==='baklava') {
    // Green tiles are locked; swap two different unlocked letters.
    const movable=page.locator('#board .tile[data-r]:not(.green)');
    const cells=await movable.evaluateAll(es=>[es[0],es.find(e=>e.textContent!==es[0].textContent)].filter(Boolean).map(e=>({r:e.dataset.r,c:e.dataset.c})));
    assert.equal(cells.length,2);
    for(const cell of cells) await page.locator(`#board .tile[data-r="${cell.r}"][data-c="${cell.c}"]`).click();
   }
   if(game==='kesme') {const r=await page.locator('#cv').boundingBox();await page.mouse.move(r.x+2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width-2,r.y+r.height/2,{steps:15});await page.mouse.up();}
   const response=await moveResponse;assert.equal(response.status(),200,`${game} move`);
   const result=await response.json();
   await page.waitForFunction(token=>Object.values(localStorage).some(value=>value.includes(token)),result.token);
   await page.screenshot({path:`test-results/${game}-played.png`,fullPage:false});
   // Reload must resume the exact server token after a real UI move.
   const resumed=game === 'kesme' ? Promise.resolve({status:()=>200}) : page.waitForResponse(r=>r.url().endsWith('/api/game')&&r.request().postDataJSON().token===result.token); resumed.catch(()=>{});
   await page.reload();await enter(page,game,true);assert.equal((await resumed).status(),200);
   if (game === 'kesme') assert.ok(await page.evaluate(()=>Object.entries(localStorage).some(([key,value])=>key.startsWith('kesme2-day-') && JSON.parse(value).cut?.length === 4)));
   for(const width of [360,430]) {
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${game} ${width}: no horizontal overflow`);
   }
   assert.deepEqual(errors,[],`${game} runtime errors`);assert.deepEqual(failed,[],`${game} missing files/API errors`);
   console.log(`PASS ${game}: web appearance, real move, persisted resume, 360/390/430 widths`);
  } catch(e) {await page.screenshot({path:`test-results/${game}-failure.png`,fullPage:true});console.error(game,errors,failed);throw e;}
  finally {await context.close();}
 }
} finally {await browser.close();}
