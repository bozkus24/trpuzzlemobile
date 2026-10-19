// İstatistikler (localStorage). Günlük ve Sınırsız ayrı tutulur.
const KEY = 'iller-globle:stats' // günlük (mevcut)
const KEY_PRACTICE = 'iller-globle:stats:practice' // sınırsız

// Tahmin dağılımı kovaları (kazanılan oyunlar için). En fazla 12 tahmin.
export const DIST_BUCKETS = [
  { label: '1', min: 1, max: 1 },
  { label: '2-3', min: 2, max: 3 },
  { label: '4-6', min: 4, max: 6 },
  { label: '7-9', min: 7, max: 9 },
  { label: '10-12', min: 10, max: 12 },
]

export function bucketIndex(guessCount) {
  return DIST_BUCKETS.findIndex((b) => guessCount >= b.min && guessCount <= b.max)
}

function defaults() {
  return {
    lastWin: null, // 'YYYY-MM-DD' - son kazanılan gün (seri için)
    lastPlayed: null, // 'YYYY-MM-DD' - biten son gün (oynanan gün sayımı için)
    gamesPlayed: 0, // tamamlanan günlük oyun (kazanma + pes)
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessSum: 0, // kazanılan oyunlardaki toplam tahmin (ortalama için)
    bestGuesses: 0, // en az tahminle kazanma (0 = yok)
    dist: DIST_BUCKETS.map(() => 0), // kazanılan oyunların tahmin dağılımı
  }
}

function loadFrom(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key)) || {}
    const s = { ...defaults(), ...raw }
    const count = n => Number.isSafeInteger(n) && n >= 0 ? n : 0
    Object.entries(defaults()).forEach(([k,v]) => { if(typeof v === 'number') s[k]=count(s[k]) })
    if(Array.isArray(s.dist)) s.dist=s.dist.map(count)
    // Eski kayıtlarda dist eksik/farklı uzunluktaysa sıfırla
    if (!Array.isArray(s.dist) || s.dist.length !== DIST_BUCKETS.length) {
      s.dist = DIST_BUCKETS.map(() => 0)
    }
    // Eski kayıtlarda gamesPlayed yoktu; her kazanma bir oynanan oyundur.
    // Tutarsızlığı gider (aksi halde kazanma yüzdesi %100'ü aşabilir).
    if (s.gamesPlayed < s.gamesWon) s.gamesPlayed = s.gamesWon
    return s
  } catch {
    return defaults()
  }
}

export function loadStats() {
  return loadFrom(KEY)
}

export function loadPracticeStats() {
  return loadFrom(KEY_PRACTICE)
}

function saveTo(key, s) {
  try {
    localStorage.setItem(key, JSON.stringify(s))
  } catch {}
  return s
}

function save(s) {
  return saveTo(KEY, s)
}

// 'YYYY-MM-DD' -> bir önceki gün
function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** Günün ili kazanımını kaydeder. Aynı gün için tekrar sayılmaz. */
export function recordDailyWin(dateKey, guessCount) {
  const s = loadStats()
  if (s.lastWin === dateKey) return s // zaten sayıldı
  const streak = s.lastWin === prevDay(dateKey) ? s.currentStreak + 1 : 1
  const dist = s.dist.slice()
  const bi = bucketIndex(guessCount)
  if (bi >= 0) dist[bi] += 1
  const alreadyPlayed = s.lastPlayed === dateKey // pes edip sonra girdiyse çift sayma
  return save({
    ...s,
    lastWin: dateKey,
    lastPlayed: dateKey,
    gamesPlayed: alreadyPlayed ? s.gamesPlayed : s.gamesPlayed + 1,
    gamesWon: s.gamesWon + 1,
    currentStreak: streak,
    maxStreak: Math.max(s.maxStreak, streak),
    guessSum: s.guessSum + guessCount,
    bestGuesses: s.bestGuesses ? Math.min(s.bestGuesses, guessCount) : guessCount,
    dist,
  })
}

/** Günün ilinde pes etmeyi kaydeder (oynanan oyun sayılır, seri sıfırlanır). */
export function recordDailyLoss(dateKey) {
  const s = loadStats()
  if (s.lastPlayed === dateKey) return s // bugün zaten sayıldı
  return save({
    ...s,
    lastPlayed: dateKey,
    gamesPlayed: s.gamesPlayed + 1,
    currentStreak: 0,
  })
}

/** Sınırsız mod kazanımını kaydeder (her oyun bağımsız; seri = üst üste galibiyet). */
export function recordPracticeWin(guessCount) {
  const s = loadPracticeStats()
  const dist = s.dist.slice()
  const bi = bucketIndex(guessCount)
  if (bi >= 0) dist[bi] += 1
  const streak = s.currentStreak + 1
  return saveTo(KEY_PRACTICE, {
    ...s,
    gamesPlayed: s.gamesPlayed + 1,
    gamesWon: s.gamesWon + 1,
    currentStreak: streak,
    maxStreak: Math.max(s.maxStreak, streak),
    guessSum: s.guessSum + guessCount,
    bestGuesses: s.bestGuesses ? Math.min(s.bestGuesses, guessCount) : guessCount,
    dist,
  })
}

/** Sınırsız mod kaybını kaydeder (oynanan oyun sayılır, seri sıfırlanır). */
export function recordPracticeLoss() {
  const s = loadPracticeStats()
  return saveTo(KEY_PRACTICE, {
    ...s,
    gamesPlayed: s.gamesPlayed + 1,
    currentStreak: 0,
  })
}

/** Ortalama tahmin (kazanılan oyunlar). */
export function avgGuesses(s) {
  return s.gamesWon ? Math.round((s.guessSum / s.gamesWon) * 10) / 10 : 0
}

/** Kazanma yüzdesi (tamamlanan günlük oyunlara göre; 0-100 arası). */
export function winPct(s) {
  if (!s.gamesPlayed) return 0
  return Math.min(100, Math.round((s.gamesWon / s.gamesPlayed) * 100))
}
