import {
  provinces,
  borderDistanceKm,
  MAX_BORDER_KM,
  NEIGHBOR_EPS_KM,
  distanceKm,
  MAX_DISTANCE_KM,
} from './provinces'

/** YYYY-MM-DD (yerel saat) - "günün ili" için tohum. */
export function todayKey(date = new Date()) {
  const tr = new Date(date.getTime() + 10800000)
  const y = tr.getUTCFullYear()
  const m = String(tr.getUTCMonth() + 1).padStart(2, '0')
  const d = String(tr.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Bulmaca numarasi - site genelinde ayni: 1 Agustos 2026 = #1. */
const EPOCH = new Date(2026, 9, 1)
export function puzzleNo(key = todayKey()) {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d) - EPOCH) / 86400000) + 1
}

// Basit deterministik hash (string -> 32bit int)
function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Belirli bir güne ait hedef il - herkes için aynı. */
export function dailyProvince(key = todayKey()) {
  const idx = hashStr('iller-globle-' + key) % provinces.length
  return provinces[idx]
}

/** Rastgele hedef il (sınırsız pratik modu). */
export function randomProvince(exclude) {
  let p
  do {
    p = provinces[Math.floor(Math.random() * provinces.length)]
  } while (exclude && p.name === exclude.name)
  return p
}

/**
 * Mesafeyi 0..1 yakınlık oranına çevirir (1 = isabet).
 * Eğri (gamma>1) uzak illeri hızla açığa iterken, yakınları koyu tutar.
 */
export function proximity(dist, max = MAX_BORDER_KM) {
  if (dist <= 0) return 1
  const x = Math.min(1, dist / max)
  return Math.max(0, (1 - x) ** 1.4)
}

// Doğru il rengi - yeşil (referans tonu)
export const TARGET_COLOR = '#3f8a2e'
// Renk körü modu: doğru il mavi (kırmızı-yeşil karışmasın)
export const TARGET_COLOR_CB = '#1f6feb'

/** Doğru il rengi (renk körü moduna göre). */
export function targetColorFor(colorBlind = false) {
  return colorBlind ? TARGET_COLOR_CB : TARGET_COLOR
}

/**
 * Yakınlığa göre "sıcaklık" rengi. Mavi yok.
 * Uzak = açık krem, yaklaştıkça krem -> turuncu -> kırmızı -> koyu bordo.
 * En uzak seviye kremden daha açık; en yakın (0 km) koyu bordo.
 * İsabet = yeşil (renk körü modunda mavi).
 */
export function heatColor(prox, isTarget = false, colorBlind = false) {
  if (isTarget) return targetColorFor(colorBlind) // doğru il
  // 0 (en uzak) -> soluk krem ... 1 (en yakın) -> koyu bordo
  const stops = [
    [0.0, [250, 240, 222]], // en uzak - soluk krem (kremden açık)
    [0.2, [240, 216, 168]], // uzak - krem (Fransa)
    [0.45, [224, 138, 84]], // ılık - turuncu (Nepal)
    [0.7, [196, 78, 58]],   // sıcak - kırmızı (Moğolistan)
    [1.0, [108, 18, 18]],   // en yakın - koyu bordo (G. Kore)
  ]
  let lo = stops[0]
  let hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (prox >= stops[i][0] && prox <= stops[i + 1][0]) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  const t = hi[0] === lo[0] ? 0 : (prox - lo[0]) / (hi[0] - lo[0])
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/** Bir tahmini değerlendirir: en yakın sınır + merkez mesafesi. Renk/yakınlık App'te seçilir. */
export function evaluateGuess(guess, target) {
  const border = borderDistanceKm(guess, target)
  const isTarget = guess.name === target.name
  return {
    province: guess,
    isTarget,
    borderKm: Math.round(border),
    centroidKm: Math.round(distanceKm(guess, target)),
    neighbor: !isTarget && border <= NEIGHBOR_EPS_KM,
  }
}
