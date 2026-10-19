export const isGameKey = key => /^(?:trw-|word500tr\.|kelime500\.|baglantilar\.|kesme2?-|petek-|waffle-|foximax-|aradle_|iller-globle:)/.test(key);
// Hydration completes before shared game code executes. Native preferences keep
// the app's own records across WebView storage eviction. No server secret lives here.
export async function installPersistence({ storage, preferences, prototype, onError = () => {} }) {
  const originalSet = prototype.setItem;
  const originalRemove = prototype.removeItem;
  const { keys } = await preferences.keys();
  for (const key of keys.filter(isGameKey)) {
    const { value } = await preferences.get({ key });
    if (value !== null) originalSet.call(storage, key, value);
  }
  let writes = Promise.resolve();
  const enqueue = work => { writes = writes.then(work).catch(onError); };
  // Migrate pre-existing app WebView records on first native launch.
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (isGameKey(key) && !keys.includes(key)) {
      const value = storage.getItem(key);
      enqueue(() => preferences.set({ key, value }));
    }
  }
  prototype.setItem = function (key, value) {
    originalSet.call(this, key, value);
    if (this === storage && isGameKey(String(key))) enqueue(() => preferences.set({ key: String(key), value: String(value) }));
  };
  prototype.removeItem = function (key) {
    originalRemove.call(this, key);
    if (this === storage && isGameKey(String(key))) enqueue(() => preferences.remove({ key: String(key) }));
  };
  return { flush: () => writes };
}
