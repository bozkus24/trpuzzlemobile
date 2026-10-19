import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

export const games = { harf500: 'word500turkce', bagla: 'trpuzzle1', kesme: 'trpuzzle2', sehirle: 'trpuzzle3', baklava: 'trpuzzle4', tilkile: 'trpuzzle6', arala: 'arala' };
// Keep upstream DOM and CSS intact. Only replace the transport, web consent
// loader and boot timing so Preferences hydration precedes every game script.
export async function packageWeb(root, output, manifest) {
  for (const [slug, repo] of Object.entries({ ...games, '': 'trpuzzlemain' })) {
    const directory = path.join(output, slug);
    await mkdir(directory, { recursive: true });
    for (const file of Object.keys(manifest.sources[repo].files)) {
      if (file === 'index.html' || file.startsWith('src/') || repo === 'trpuzzlemain') continue;
      const relative = file.replace(/^public\//, '');
      await mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
      await cp(path.join(root, 'vendor', repo, file), path.join(directory, relative));
    }
    if (slug) {
      await mkdir(path.join(directory, 'assets'), { recursive: true });
      await cp(path.join(output, 'assets/tilkile.png'), path.join(directory, 'assets/tilkile.png'));
    }
    let html = await readFile(path.join(root, 'vendor', repo, 'index.html'), 'utf8');
    if (!slug) html = html.replace(/Sitede üçüncü taraf reklam[\s\S]*?açıklanır\./, 'Bu uygulamada reklam veya analiz SDK’sı bulunmaz. Ayrıntılar <a href="/about.html">uygulama hakkında</a> sayfasında açıklanır.');
    const scripts = [];
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attributes, code) => {
      const src = attributes.match(/src=["']([^"']+)/)?.[1];
      if (src && /privacy-controls|game-remote/.test(src)) return '';
      if (code.includes('root.TrPuzzleRemote=Object.freeze')) return '';
      if (src === '/src/main.jsx') { scripts.push('city.js'); return ''; }
      if (src) throw new Error(`Unreviewed external script: ${repo}: ${src}`);
      code = code.replace(/(['"])DOMContentLoaded\1/g, '"trpuzzle:ready"');
      // Legacy offline answer indices are unused by the server-backed Harf500.
      if (slug === 'harf500') code = code.replace(/var HAVUZLAR = \{[\s\S]*?\n  \};/, 'var HAVUZLAR = { kolay: [], standart: [], zor: [] };');
      if (slug === 'bagla') code = code.replace('    panoyaKopyala(metin);', '    if (!navigator.share) panoyaKopyala(metin);');
      scripts.push(code);
      return '';
    });
    const files = [];
    for (const [index, code] of scripts.entries()) {
      const file = code === 'city.js' ? code : `web-${index}.js`;
      if (code !== 'city.js') await writeFile(path.join(directory, file), code);
      files.push(`/${slug ? slug + '/' : ''}${file}`);
    }
    if (slug === 'sehirle') {
      await build({ entryPoints: [path.join(root, 'vendor/trpuzzle3/src/main.jsx')], outfile: path.join(directory, 'city.js'),
        bundle: true, format: 'iife', jsx: 'automatic', target: ['safari15', 'chrome100'], minify: true,
        define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'file', '.jpg': 'file' }, assetNames: 'assets/[name]-[hash]' });
      html = html.replace('</head>', '<link rel="stylesheet" href="city.css"></head>');
    }
    html = html.replace(/<meta\b[^>]*name=["']google-adsense-account["'][^>]*>/gi, '')
      .replace(/(href|data-url)=["']https:\/\/trpuzzle.com\//g, '$1="/')
      .replace(/href=["']\/(?:gizlilik|kosullar|iletisim)\.html["']/g, match => match.replace('="/', '="https://trpuzzle.com/'))
      .replace(/href=["']\/hakkinda.html["']/g, 'href="/about.html"')
      .replace(/(<meta\b[^>]*name=["']viewport["'][^>]*content=["'])([^"']+)/i, (_, start, content) => start + content.replace(/,?\s*maximum-scale=[^,]+|,?\s*user-scalable=[^,]+/g, '') + ',viewport-fit=cover')
      .replace('</head>', '<link rel="stylesheet" href="/native.css"></head>')
      .replace('<body>', `<body class="native-page" data-game="${slug}"><div id="connection" role="status" hidden></div><div id="load-error" role="alert" hidden><p id="load-error-text"></p><button id="retry-game">Yeniden dene</button><a href="/">Ana sayfa</a></div>`)
      .replace('</body>', `<script>window.__TP_SCRIPTS__=${JSON.stringify(files)};</script><script src="/assets/mobile.js"></script></body>`);
    if (/adsbygoogle|privacy-controls|<iframe/i.test(html)) throw new Error(`Web-only integration in ${repo}`);
    await writeFile(path.join(directory, 'index.html'), html);
  }
}
