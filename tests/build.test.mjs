import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
test('packaged game contains no server data, advertising or remote website frame', async () => {
  const files = await readdir(new URL('../dist/', import.meta.url), { recursive: true });
  assert.ok(!files.some(file => /(^|\/)(server|\.env|catalog|cevaplar|netlify)/.test(file)));
  const html = await readFile(new URL('../dist/harfle/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /adsbygoogle|google-adsense|privacy-controls|<iframe|tp-splash/);
  const words = await readFile(new URL('../dist/harfle/words.js', import.meta.url), 'utf8');
  assert.doesNotMatch(words, /const\s+ANSWERS\s*=/);
  const config = JSON.parse(await readFile(new URL('../capacitor.config.json', import.meta.url)));
  assert.equal(config.webDir, 'dist'); assert.equal(config.server?.url, undefined);
});

test('all eight games and the web homepage are packaged with local navigation', async () => {
  const games = ['harfle','harf500','bagla','baklava','kesme','tilkile','arala','sehirle'];
  for (const game of games) {
    const html = await readFile(new URL(`../dist/${game}/index.html`, import.meta.url), 'utf8');
    assert.match(html, /assets\/mobile.js/);
    assert.doesNotMatch(html, /adsbygoogle|google-adsense|privacy-controls|<iframe|src=["']https?:/);
  }
  const home = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.equal((home.match(/class="game-card"/g)||[]).length, 8);
  for (const game of games) assert.ok(home.includes(`data-url="/${game}/"`), game);
  assert.match(home, /trackerCount/);
  const data = await readFile(new URL('../dist/harf500/web-3.js', import.meta.url), 'utf8');
  assert.match(data, /HAVUZLAR = \{ kolay: \[\], standart: \[\], zor: \[\] \}/);
});
