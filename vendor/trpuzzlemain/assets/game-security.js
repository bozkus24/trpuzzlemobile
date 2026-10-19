/* Kayıtlar güvenilir girdi değildir. Eski geçerli kayıtları koruyarak türleri doğrula. */
(function () {
  'use strict';
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stats(value, fields, buckets, distribution = 'dist') {
    const result = {...object(value)};
    fields.forEach(key => result[key] = count(result[key]));
    if (buckets) {
      const source = object(result[distribution]);
      result[distribution] = Object.fromEntries(buckets.map(key => [key, count(source[key])]));
    }
    return result;
  }
  window.TrPuzzleSecurity = Object.freeze({object, count, escape, stats});
})();
