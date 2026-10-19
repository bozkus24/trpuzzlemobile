import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { createTransport } from './transport.js';
import { installPersistence } from './storage.js';

const native = Capacitor.isNativePlatform();
const harflePage = location.pathname.startsWith('/harfle');
const gamePage = /^\/(harfle|harf500|bagla|kesme|sehirle|baklava|tilkile|arala)(?:\/|$)/.test(location.pathname);
const loadScript = src => new Promise((resolve, reject) => {
  const script = document.createElement('script'); script.src = src;
  script.onload = resolve; script.onerror = () => reject(new Error('Oyun dosyası yüklenemedi. Uygulamayı yeniden aç.')); document.body.append(script);
});
let persistence = { flush: async () => {} };
let lastOpen = null, apiBusy = false;
function notice(text) {
  const el = document.getElementById('connection');
  if (el) { el.textContent = text; el.hidden = !text; }
}
async function request(body) {
  if (native) return CapacitorHttp.post({ url: __API_URL__, headers: { 'Content-Type': 'application/json' },
    data: body, connectTimeout: 12000, readTimeout: 15000, responseType: 'json' });
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal, cache: 'no-store' });
    return { status: response.status, data: await response.json() };
  } finally { clearTimeout(timer); }
}
async function safeNavigate(url) { await persistence.flush(); location.href = url; }
async function main() {
  if (native) {
    persistence = await installPersistence({ storage: localStorage, preferences: Preferences, prototype: Storage.prototype,
      onError: () => notice('Kalıcı kayıt yazılamadı. Uygulamayı kapatmadan önce cihazında boş alan aç.') });
  }
  await loadScript('/assets/game-clock.js');
  const openedDay = window.TrPuzzleClock.key();
  const dateLabel = document.getElementById('mobile-date');
  if (dateLabel) dateLabel.textContent = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' }).format(new Date());
  const refreshDay = () => {
    if (openedDay !== window.TrPuzzleClock.key()) {
      notice('Yeni günün bulmacası hazır. Kaydın korundu; ana sayfadan bugünkü oyunu açabilirsin.');
      if (!gamePage) window.dispatchEvent(new Event('focus'));
    }
  };
  window.addEventListener('online', () => { notice(''); refreshDay(); });
  window.addEventListener('offline', () => notice('Çevrimdışısın. Oynamak için internet bağlantısı gerekiyor; kayıtların korunuyor.'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
  setInterval(refreshDay, 60000);
  if (!navigator.onLine) notice('Çevrimdışısın. Oynamak için internete bağlan; kayıtların korunuyor.');
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname !== location.pathname) {
      event.preventDefault(); safeNavigate(url.href);
    }
  });
  if (native) {
    await App.addListener('appStateChange', ({ isActive }) => { if (isActive) refreshDay(); else persistence.flush(); });
    await App.addListener('backButton', async () => {
      if (!gamePage) { if (closeWebDialog()) return; await persistence.flush(); await App.minimizeApp(); return; }
      if (!harflePage) {
        if (closeWebDialog()) return;
        await safeNavigate('/'); return;
      }
      const overlay = ['settings', 'howto', 'overlay'].map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
      if (overlay) { overlay.querySelector('[data-close],#modal-close,#howto-ok')?.click(); return; }
      const archive = document.getElementById('archive');
      if (archive && !archive.classList.contains('hidden') && document.querySelector('#board .tile')) {
        document.querySelector('[data-show="game"]')?.click(); return;
      }
      await safeNavigate('/');
    });
  }
  if (!gamePage) { await loadWebScripts(); return; }
  window.TrPuzzleRemote = createTransport({ request, onState(state, body, data) {
    apiBusy = state === 'loading';
    document.body.classList.toggle('api-busy', apiBusy);
    if (body.action !== 'move') {
      if (state === 'loading') { lastOpen = body; document.getElementById('load-error').hidden = true; }
      if (state === 'ready') { document.getElementById('load-error').hidden = true; }
      if (state === 'error') {
        document.getElementById('load-error-text').textContent = data;
        document.getElementById('load-error').hidden = false;
      }
    }
    if (state === 'error' && body.action === 'move') notice(data);
    if (state === 'ready') {
      notice('');
      if (body.action === 'move' && native) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
  } });
  if (!harflePage) {
    document.getElementById('retry-game').addEventListener('click', () => { if (!apiBusy) location.reload(); });
    await loadWebScripts();
    return;
  }
  await loadScript('/assets/game-security.js');
  await loadScript('/harfle/words.js');
  // Intercept sharing before the shared handler. Cancellation never copies text.
  document.getElementById('share-btn').addEventListener('click', async event => {
    event.stopImmediatePropagation();
    const text = window.buildShareText();
    try {
      if (native) await Share.share({ title: 'Harfle · TrPuzzle', text, dialogTitle: 'Sonucunu paylaş' });
      else if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); document.getElementById('copied-toast').classList.remove('hidden'); }
    } catch (error) { if (error.name !== 'AbortError' && !/cancel|dismiss/i.test(error.message)) notice('Paylaşım açılamadı. Yeniden deneyebilirsin.'); }
  }, true);
  await loadScript('/harfle/game.js');
  document.getElementById('retry-game').addEventListener('click', () => {
    if (apiBusy) return;
    const date = lastOpen?.date || window.TrPuzzleClock.key();
    window.startGame(new Date(date + 'T12:00:00'));
  });
  if (location.hash === '#istatistik') {
    document.getElementById('howto').classList.add('hidden');
    window.openStats();
  }
  // The legacy keyboard ignores only the result dialog. Also guard help,
  // settings and archive transitions while a server request is in flight.
  document.addEventListener('keydown', event => {
    if (['howto','settings'].some(id => !document.getElementById(id).classList.contains('hidden'))) event.stopImmediatePropagation();
  }, true);
  document.addEventListener('click', event => {
    if (apiBusy && event.target.closest('.archive-item,[data-go],[data-show]')) { event.stopImmediatePropagation(); event.preventDefault(); }
    if (!apiBusy && event.target.closest('[data-show="game"]') && !document.querySelector('#board .tile')) {
      event.stopImmediatePropagation(); window.startGame(window.TrPuzzleClock.calendar());
    }
    if (event.target.closest('.archive-item')) document.getElementById('load-error').hidden = true;
  }, true);
  // Guard the legacy archive's synchronous null access if its first load failed.
  const originalBuildArchive = window.buildArchive;
  window.buildArchive = function () {
    originalBuildArchive();
    for (const [index, old] of [...document.querySelectorAll('.archive-item')].entries()) {
      const item = old.cloneNode(true); old.replaceWith(item);
      const date = window.TrPuzzleClock.calendar(); date.setDate(date.getDate() - index);
      item.tabIndex = 0; item.setAttribute('role', 'button');
      item.addEventListener('click', () => { if (!apiBusy) { window.closeModal(); window.startGame(date); } });
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); } });
    }
  };
  const applyRoute = () => {
    if (location.hash === '#arsiv') { window.closeModal(); document.getElementById('howto').classList.add('hidden'); window.show('archive'); }
    if (location.hash === '#istatistik') { document.getElementById('howto').classList.add('hidden'); window.openStats(); }
  };
  window.addEventListener('hashchange', applyRoute);
  applyRoute();
  document.querySelectorAll('.overlay').forEach(el => { el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); });
  new MutationObserver(() => {
    document.body.classList.toggle('dialog-open', !!document.querySelector('.overlay:not(.hidden)'));
    document.querySelectorAll('.key[data-key="SIL"]').forEach(el => el.setAttribute('aria-label', 'Harf sil'));
  }).observe(document.getElementById('app'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
}
function closeWebDialog() {
  const visible = el => el && !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  for (const [drawer, close] of [['#drawer.open','#drawerClose'], ['#tpDrawer.open','#tpDrawerX']]) {
    if (visible(document.querySelector(drawer))) { document.querySelector(close)?.click(); return true; }
  }
  const dialogs = [...document.querySelectorAll('.perde.acik,.overlay.open,.overlay.show,.modal.open,.modal.show,.modal-overlay:not([hidden]),[role="dialog"][aria-modal="true"]')].filter(visible);
  for (const dialog of dialogs.reverse()) {
    const close = [...dialog.querySelectorAll('#confirm-no,[data-close],[data-kapat],[aria-label="Kapat"],.close,.close-btn,.x,button[id$="Close"],button[id$="CloseX"]')].find(visible);
    if (close) { close.click(); return true; }
  }
  return false;
}
async function loadWebScripts() {
  // Preserve every game's share text and let its own handlers open the phone sheet.
  if (native) Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
    try { await Share.share({ title: data.title || 'TrPuzzle', text: data.text, url: data.url, dialogTitle: 'Sonucunu paylaş' }); }
    catch (error) {
      if (/cancel|dismiss/i.test(error.message)) throw new DOMException('Paylaşım iptal edildi', 'AbortError');
      throw error;
    }
  } });
  for (const src of window.__TP_SCRIPTS__ || []) await loadScript(src);
  document.dispatchEvent(new Event('trpuzzle:ready'));
  document.body.dataset.mobileReady = 'true';
}
main().catch(error => {
  notice(error.message || 'Uygulama hazırlanamadı. Lütfen yeniden aç.');
  const panel = document.getElementById('load-error');
  if (panel) { panel.hidden = false; document.getElementById('load-error-text').textContent = 'Uygulama başlatılamadı. Yeniden dene.';
    document.getElementById('retry-game').onclick = () => location.reload(); }
});
