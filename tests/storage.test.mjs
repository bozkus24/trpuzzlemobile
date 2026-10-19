import test from 'node:test';
import assert from 'node:assert/strict';
import { installPersistence } from '../src/storage.js';
test('native records hydrate before play and writes stay ordered', async () => {
  class Storage {
    data = new Map([['trw-stats', '{"played":1}']]);
    get length() { return this.data.size; }
    key(i) { return [...this.data.keys()][i]; }
    getItem(key) { return this.data.get(key) ?? null; }
    setItem(key, value) { this.data.set(key, value); }
    removeItem(key) { this.data.delete(key); }
  }
  const store = new Storage(), persisted = new Map([['trw-2026-10-19', '{"token":"saved"}']]);
  const operations = [];
  const bridge = await installPersistence({ storage: store, prototype: Storage.prototype, preferences: {
    keys: async () => ({ keys: [...persisted.keys()] }), get: async ({ key }) => ({ value: persisted.get(key) }),
    set: async ({ key, value }) => { await new Promise(r => setTimeout(r, 2)); operations.push(value); persisted.set(key, value); },
    remove: async ({ key }) => { persisted.delete(key); }
  } });
  assert.equal(store.getItem('trw-2026-10-19'), '{"token":"saved"}');
  store.setItem('trw-2026-10-19', 'first'); store.setItem('trw-2026-10-19', 'second');
  store.setItem('unrelated', 'private');
  await bridge.flush();
  assert.equal(persisted.get('trw-2026-10-19'), 'second');
  assert.equal(persisted.get('trw-stats'), '{"played":1}');
  assert.equal(persisted.has('unrelated'), false);
  assert.deepEqual(operations.slice(-2), ['first', 'second']);
  store.removeItem('trw-2026-10-19'); await bridge.flush();
  assert.equal(persisted.has('trw-2026-10-19'), false);
});
