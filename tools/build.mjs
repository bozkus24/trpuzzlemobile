import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { build } from 'esbuild';
import { packageWeb } from './package-web.mjs';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
const api = process.env.TRPUZZLE_API_URL || 'https://trpuzzle.com/api/game';
if (new URL(api).protocol !== 'https:') throw new Error('Native builds require an HTTPS game API.');
const manifest = JSON.parse(await readFile(path.join(root, 'vendor/manifest.json')));
for (const [repo, source] of Object.entries(manifest.sources)) {
  for (const [file, expected] of Object.entries(source.files)) {
    const bytes = await readFile(path.join(root, 'vendor', repo, file));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Shared source changed: ${repo}/${file}. Use sync:games.`);
  }
}
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'harfle'), { recursive: true });
await cp(path.join(root, 'src/public'), output, { recursive: true });
await cp(path.join(root, 'vendor/trpuzzlemain/assets'), path.join(output, 'assets'), { recursive: true });
for (const file of ['game.js', 'words.js', 'style.css', 'logo.png', 'favicon.png']) {
  await cp(path.join(root, 'vendor/harfle', file), path.join(output, 'harfle', file));
}
// One explicit boot seam: archive links must not start today's game and then
// navigate away from the archive when its network response arrives.
const gamePath = path.join(output, 'harfle/game.js');
const game = await readFile(gamePath, 'utf8');
const boot = '\nstartGame(TrPuzzleClock.calendar());\n';
if (game.split(boot).length !== 2) throw new Error('Review Harfle startup adapter: expected exactly one boot call.');
await writeFile(gamePath, game.replace(boot, '\nif (location.hash !== "#arsiv") startGame(TrPuzzleClock.calendar());\n'));
// Extract only the playable UI. The website splash, ads, consent loader and
// unrelated navigation never enter the app. Game rules come from the pinned source.
const source = await readFile(path.join(root, 'vendor/harfle/index.html'), 'utf8');
const start = source.indexOf('<div id="app">');
const end = source.indexOf('<script src="words.js">', start);
if (start < 0 || end < 0) throw new Error('Harfle HTML structure changed; review the mobile extraction.');
let ui = source.slice(start, end);
ui = ui.replace('id="board" class="board"', 'id="board" class="board" role="group" aria-label="Tahmin tahtası"');
ui = ui.replace('id="message" class="message"', 'id="message" class="message" role="status" aria-live="polite"');
await writeFile(path.join(output, 'harfle/index.html'), `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f7f6f2"><title>Harfle · TrPuzzle</title>
<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="/mobile.css"></head>
<body class="mobile-game">
<div id="connection" role="status" hidden></div>
<div id="load-error" role="alert" hidden><p id="load-error-text"></p><button id="retry-game">Yeniden dene</button><a href="/">Ana sayfa</a></div>
${ui}<script src="/assets/mobile.js"></script></body></html>`);
await packageWeb(root, output, manifest);
await build({ entryPoints: [path.join(root, 'src/bootstrap.js')], outfile: path.join(output, 'assets/mobile.js'), bundle: true,
  format: 'iife', target: ['safari15', 'chrome100'], define: { __API_URL__: JSON.stringify(api) }, minify: true });
// Defense in depth: do not ship source HTML, answer tables or advertising loaders.
const html = await readFile(path.join(output, 'harfle/index.html'), 'utf8');
if (/adsbygoogle|privacy-controls|google-adsense|<iframe/i.test(html)) throw new Error('Unexpected web-only integration in mobile HTML');
console.log('Built dist/: local app shell + all eight shared games, API:', api);
