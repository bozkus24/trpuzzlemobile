import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
const page=await context.newPage();page.setDefaultTimeout(12000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base);await page.locator('body[data-mobile-ready=true]').waitFor();
 assert.equal(await page.locator('.game-card').count(),8);
 for(const game of ['harfle','harf500','bagla','kesme','sehirle','baklava','tilkile','arala']) {
  const link=page.locator(`.btn-play[data-url="/${game}/"]`);
  await link.click();await page.waitForURL(`${base}/${game}/`);
  await page.goto(base);await page.locator('body[data-mobile-ready=true]').waitFor();
 }
 const archives={harf500:'#arsiv-pencere',bagla:'#perdeArsiv',kesme:'#archiveModal',baklava:'#archiveOverlay',tilkile:'#archive-modal',arala:'#archiveModal'};
 for(const [game,selector] of Object.entries(archives)) {
  await page.goto(`${base}/${game}/#arsiv`);
  await page.locator('body[data-mobile-ready=true]').waitFor();
  // Harf500 calls its modal "modal-arsiv" in the pinned web source.
  const dialog=game==='harf500'?page.locator('#arsiv-liste'):page.locator(selector);
  await dialog.waitFor({state:'visible'});
  await page.waitForTimeout(700);
  assert.ok(await dialog.isVisible(),`${game} archive survives async daily startup`);
  console.log(`PASS ${game}: direct archive route`);
 }
 // Verify the homepage understands each game's original storage format.
 await page.goto(base);await page.locator('body[data-mobile-ready=true]').waitFor();
 await page.evaluate(()=>{
  const date=TrPuzzleClock.key(),day=TrPuzzleClock.day(),fox=day-Date.UTC(2026,7,1)/864e5+1,arala=day-Date.UTC(2026,0,1)/864e5;
  const data={'word500tr.ayarlar':{seviye:'standart'},['trw-'+date]:{done:true},['word500tr.oyun.standart.'+date]:{surum:1,bitti:true},'petek-progress-v1':{[day]:{phase:'win'}},['foximax-daily-'+fox]:{status:'won'},['baglantilar.2026-10-03.gunluk.'+(day-Date.UTC(2026,9,3)/864e5+1)]:{durum:'kazandi'},['iller-globle:daily:'+date]:{won:true},'aradle_days_v2':{[arala]:{done:true}},['kesme2-day-'+date]:{cut:[0,.5,1,.5]}};
  for(const [key,value] of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
 });
 await page.reload();await page.locator('#trackerCount').filter({hasText:'hepsini tamamladın'}).waitFor();
 assert.equal(await page.locator('.btn-play').filter({hasText:'Sonucu Gör'}).count(),8);
 assert.equal(await page.locator('.tracker-game[data-state=completed]').count(),8);
 await page.screenshot({path:'test-results/home-completed.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: eight local home links, archive routes, all-game daily progress');
} finally {await browser.close();}
