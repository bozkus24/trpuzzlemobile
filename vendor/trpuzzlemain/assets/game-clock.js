/* Günlük bulmacalarda ortak Türkiye takvimi. Kayıt anahtarları değişmez. */
(function () {
  const dayMs = 86400000, offset = 10800000;
  function parts(now = new Date()) {
    const tr = new Date(now.getTime() + offset);
    return [tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()];
  }
  window.TrPuzzleClock = {
    key(now = new Date()) { const [y,m,d] = parts(now); return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; },
    calendar(now = new Date()) { const [y,m,d] = parts(now); return new Date(y,m,d,12); },
    day(now = new Date()) { return Math.floor(Date.UTC(...parts(now)) / dayMs); },
    remaining(now = new Date()) { return (Math.floor((now.getTime()+offset)/dayMs)+1)*dayMs-offset-now.getTime(); }
  };
})();
