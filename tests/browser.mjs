import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width:390, height:844 }, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'tr-TR', timezoneId:'Europe/Istanbul' });
const page = await context.newPage();
context.setDefaultTimeout(12000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
await mkdir('test-results', { recursive:true });
try {
  await page.goto(base); await page.locator('#puzzle-number').filter({ hasText:'BULMACA' }).waitFor();
  await page.screenshot({ path:'test-results/home-390.png', fullPage:true });
  await page.getByRole('link', { name:'Harfle oyna' }).click();
  await page.locator('#board .tile').first().waitFor();
  if (await page.locator('#howto').isVisible()) { await page.locator('#howto-dont').check(); await page.locator('#howto-ok').click(); }
  assert.equal(await page.locator('#board .tile').count(), 30);
  // Compare actual rendered game styling with the canonical web stylesheet.
  // Only safe-area/scroll behavior may differ; the phone has no inset here.
  const appearance = () => Object.fromEntries(['#board .tile','.key','.bar','.bar-logo','.bar-name','.modal','.menu-btn'].map(selector => {
    const css = getComputedStyle(document.querySelector(selector));
    return [selector, Object.fromEntries(['borderRadius','fontFamily','fontSize','color','backgroundColor','padding','width','height'].map(key => [key, css[key]]))];
  }));
  const mobileAppearance = await page.evaluate(appearance);
  await page.locator('link[href="/mobile.css"]').evaluate(link => { link.disabled = true; });
  assert.deepEqual(mobileAppearance, await page.evaluate(appearance));
  await page.locator('link[href="/mobile.css"]').evaluate(link => { link.disabled = false; });
  for (const letter of 'KALEM') await page.locator(`.key[data-key="${letter}"]`).click();
  await page.locator('.key[data-key="ENTER"]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('trw-' + TrPuzzleClock.key()))?.guesses?.length === 1);
  await page.waitForTimeout(2200);
  await page.reload(); await page.locator('#board .tile').first().waitFor();
  console.log('Resume verified');
  assert.equal(await page.locator('#board .row').first().innerText().then(t => t.replace(/\s/g,'')), 'KALEM');
  await page.screenshot({ path:'test-results/game-390.png', fullPage:true });
  // Offline move must retain the input and the last resumable token.
  const before = await page.evaluate(() => localStorage.getItem('trw-' + TrPuzzleClock.key()));
  await context.setOffline(true);
  for (const letter of 'DENİZ') await page.locator(`.key[data-key="${letter}"]`).click();
  await page.locator('.key[data-key="ENTER"]').click();
  await page.locator('#connection').filter({ hasText:'korundu' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('trw-' + TrPuzzleClock.key())), before);
  assert.match(await page.locator('#board .row').nth(1).innerText().then(t => t.replace(/\s/g,'')), /DENİZ/);
  await context.setOffline(false);
  console.log('Offline save verified');
  await page.locator('.key[data-key="ENTER"]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('trw-' + TrPuzzleClock.key()))?.guesses?.length === 2);
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name:'Arşiv', exact:true }).click();
  await page.locator('.archive-item').nth(1).click();
  await page.waitForFunction(() => !document.body.classList.contains('api-busy'));
  await page.locator('#game:not(.hidden)').waitFor();
  await page.goto(base + '/harfle/#arsiv'); await page.locator('.archive-item').first().waitFor();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('#archive').isVisible(), true);
  await page.screenshot({ path:'test-results/archive-390.png', fullPage:true });
  // Narrow phone geometry and settings must remain usable.
  await page.setViewportSize({ width:360,height:640 });
  await page.goto(base + '/harfle/'); await page.locator('#board .tile').first().waitFor();
  const geometry = await page.evaluate(() => ({ width:innerWidth,scroll:document.documentElement.scrollWidth,board:document.getElementById('board').getBoundingClientRect().bottom,keyboard:document.getElementById('keyboard').getBoundingClientRect().top,bottom:document.getElementById('keyboard').getBoundingClientRect().bottom,height:innerHeight }));
  assert.ok(geometry.scroll <= geometry.width, JSON.stringify(geometry));
  assert.ok(geometry.board <= geometry.keyboard, JSON.stringify(geometry));
  assert.ok(geometry.bottom <= geometry.height + 1, JSON.stringify(geometry));
  await page.screenshot({ path:'test-results/game-360.png', fullPage:true });
  await page.getByRole('button', { name:'Ayarlar', exact:true }).click();
  await page.getByLabel('Tema', { exact:true }).selectOption('dark');
  await page.locator('[data-close="settings"]').click();
  assert.equal(await page.locator('body').evaluate(el => el.classList.contains('light')), false);
  await page.goto(base); await page.locator('#play-label').filter({ hasText:'devam' }).waitFor();
  // First launch with the server unavailable shows a persistent retry action.
  const failed = await context.newPage();
  await failed.route('**/api/game', route => route.fulfill({ status:503, contentType:'application/json', body:'{"error":"SERVICE_UNAVAILABLE"}' }));
  await failed.goto(base + '/harfle/'); await failed.locator('#load-error').waitFor({ state:'visible' });
  await failed.unroute('**/api/game'); await failed.locator('#retry-game').click();
  await failed.locator('#board .tile').first().waitFor();
  await failed.close();
  // Deterministic result fixture: verifies stats and sharing without revealing
  // any real hidden daily answer. This fixture is never included in dist/.
  const resultContext = await browser.newContext({ viewport:{ width:390,height:844 }, locale:'tr-TR' });
  const resultPage = await resultContext.newPage(); resultPage.setDefaultTimeout(12000);
  await resultPage.addInitScript(() => {
    localStorage.setItem('trw-howtoSeen', '1');
    Object.defineProperty(navigator, 'share', { configurable:true, value:async data => { window.sharedResult = data.text; } });
  });
  await resultPage.route('**/api/game', async route => {
    const body = route.request().postDataJSON();
    const done = body.action === 'move' || body.token === 'fixture-win';
    await route.fulfill({ contentType:'application/json', body:JSON.stringify({ token:done?'fixture-win':'fixture-start',
      view:{ game:'harfle',date:body.date,mode:'daily',guesses:done?['KALEM']:[],scores:done?[Array(5).fill('correct')]:[],done,win:done,...(done?{answer:'KALEM'}:{}) } }) });
  });
  await resultPage.goto(base + '/harfle/'); await resultPage.locator('#board .tile').first().waitFor();
  for (const letter of 'KALEM') await resultPage.locator(`.key[data-key="${letter}"]`).click();
  await resultPage.locator('.key[data-key="ENTER"]').click();
  await resultPage.locator('#share-btn').waitFor({ state:'visible' });
  await resultPage.locator('#share-btn').click();
  assert.match(await resultPage.evaluate(() => window.sharedResult), /Harfle #\d+ 1\/6/);
  await resultPage.screenshot({ path:'test-results/result-390.png', fullPage:true });
  await resultPage.goto(base); await resultPage.locator('#played').filter({ hasText:'1' }).waitFor();
  assert.equal(await resultPage.locator('#best').textContent(), '1');
  await resultContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS: daily play, resume, offline retry, archive, theme, 360×640 layout, recovery, results, sharing and home stats.');
} catch(error) {
  await page.screenshot({ path:'test-results/failure.png', fullPage:true });
  console.error('Page errors:', errors, 'Message:', await page.locator('#message').textContent().catch(() => ''));
  throw error;
} finally { await browser.close(); }
