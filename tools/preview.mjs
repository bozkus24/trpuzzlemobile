import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(import.meta.dirname, '../dist');
let localService;
const flag = process.argv.indexOf('--local-api');
if (flag >= 0) {
  // Development only: read secrets inside this server process. Nothing is
  // copied into this repository, sent to the browser, or included by build.mjs.
  const source = path.resolve(process.argv[flag + 1] || '../trpuzzlemain');
  for (const line of (await readFile(path.join(source, '.env'), 'utf8')).split('\n')) {
    const match = line.match(/^(TRPUZZLE_SERVER_(?:KEY|START))=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
  const { serverKey, decryptCatalog } = await import(pathToFileURL(path.join(source, 'server/crypto.mjs')));
  const { createService } = await import(pathToFileURL(path.join(source, 'server/service.mjs')));
  const key = serverKey();
  localService = createService({ key, data: decryptCatalog(await readFile(path.join(source, 'server/catalog.enc')), key), cutover: process.env.TRPUZZLE_SERVER_START });
}
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host}`;
    const url = new URL(req.url, origin);
    if (url.pathname === '/api/game') {
      if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
      if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') { res.writeHead(403); res.end(); return; }
      let body = '', size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 32768) { res.writeHead(413); res.end(); return; } body += chunk; }
      let data;
      try { data = JSON.parse(body); } catch { res.writeHead(400); res.end('{}'); return; }
      if (localService) {
        try { const result = localService(data); res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(JSON.stringify(result)); }
        catch { res.writeHead(400, { 'Content-Type':'application/json' }); res.end(JSON.stringify({ error:'INVALID_REQUEST' })); }
      } else {
        const response = await fetch('https://trpuzzle.com/api/game', { method:'POST', headers:{ 'Content-Type':'application/json' }, body, signal:AbortSignal.timeout(15000) });
        res.writeHead(response.status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(await response.text());
      }
      return;
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('outside');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    if (!(await realpath(file)).startsWith(root + path.sep)) throw new Error('outside');
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch {
    if (req.url === '/api/game') { res.writeHead(503, { 'Content-Type':'application/json' }); res.end(JSON.stringify({ error:'SERVICE_UNAVAILABLE' })); }
    else { res.writeHead(404); res.end('Not found'); }
  }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`TrPuzzle mobile: http://127.0.0.1:${server.address().port} (${localService ? 'local answer service' : 'live answer service'})`));
