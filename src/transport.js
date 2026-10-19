const messages = {
  PUZZLE_UNAVAILABLE: 'Bu günün bulmacası henüz açılmadı.',
  INVALID_MOVE: 'Bu hamle geçerli değil.', GAME_FINISHED: 'Bu oyun zaten tamamlandı.',
  INVALID_SESSION: 'Oyun kaydı doğrulanamadı. Kaydın silinmedi; yeniden dene.',
  INVALID_REQUEST: 'Oyun tarihi doğrulanamadı. Cihazının tarihini kontrol et.'
};
export function createTransport({ request, onState = () => {} }) {
  const pending = new WeakSet();
  async function send(body) {
    onState('loading', body);
    try {
      const response = await request(body);
      if (response.status === 429) throw new Error('Biraz bekleyip yeniden dene. Çok hızlı işlem yapıldı.');
      const data = response.data;
      if (response.status !== 200 || !data || typeof data.token !== 'string' || !data.view) {
        throw new Error(messages[data?.error] || 'Oyun sunucusuna ulaşılamadı. Kaydın ve tahminin korundu; yeniden dene.');
      }
      onState('ready', body, data);
      return data;
    } catch (error) {
      const message = error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError
        ? 'Bağlantı kurulamadı. Kaydın ve tahminin korundu; bağlantını kontrol edip yeniden dene.' : error.message;
      onState('error', body, message);
      throw new Error(message);
    }
  }
  return Object.freeze({
    open(game, options = {}) { return send({ ...options, game, action: options.token ? 'resume' : 'start' }); },
    async move(session, move) {
      if (pending.has(session)) throw new Error('Önceki hamle kontrol ediliyor.');
      pending.add(session);
      try {
        const next = await send({ action: 'move', token: session.token, move });
        Object.assign(session, next);
        return next.view;
      } finally { pending.delete(session); }
    }
  });
}
