import { geoCentroid } from 'd3-geo'
import rawGeo from '../data/provinces.geojson.json'

// Ham GeoJSON (81 il, MultiPolygon). Her feature: { properties: { name, number } }
export const geo = rawGeo

/**
 * Türkçe metni eşleştirme için normalize eder:
 * büyük/küçük harf, Türkçe karakter ve boşluk/işaret farklarını yok sayar.
 * Örn: "İSTANBUL" -> "istanbul", "Ağrı" -> "agri"
 */
export function normalize(str) {
  if (!str) return ''
  let s = String(str)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
  // kalan aksanları da temizle
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return s.replace(/[^a-z0-9]/g, '')
}

// Bir ile ait yaygın alternatif/kısa adlar -> veri setindeki resmi ad
const ALIASES = {
  afyonkarahisar: 'Afyon',
  antep: 'Gaziantep',
  gantep: 'Gaziantep',
  maras: 'Kahramanmaraş',
  kmaras: 'Kahramanmaraş',
  urfa: 'Şanlıurfa',
  icel: 'Mersin',
  constantinople: 'İstanbul',
  izmit: 'Kocaeli',
  adapazari: 'Sakarya',
}

/**
 * Her il için: ad, plaka no, geojson feature'ı ve küresel centroid [lon, lat].
 * Centroid mesafe/sıcaklık ipuçları için kullanılır.
 */
export const provinces = geo.features
  .map((feature) => {
    const name = feature.properties.name
    const [lon, lat] = geoCentroid(feature)
    return {
      name,
      plate: feature.properties.number,
      key: normalize(name),
      feature,
      lon,
      lat,
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

// Hızlı arama için: normalize edilmiş ad -> il
const byKey = new Map()
for (const p of provinces) byKey.set(p.key, p)

// Alias'ları da eşleme tablosuna ekle
const aliasByKey = new Map()
for (const [alias, canonical] of Object.entries(ALIASES)) {
  const p = provinces.find((x) => x.name === canonical)
  if (p) aliasByKey.set(normalize(alias), p)
}

/** Kullanıcının yazdığı metne karşılık gelen ili bul (alias'lar dahil). */
export function findProvince(input) {
  const k = normalize(input)
  if (!k) return null
  return byKey.get(k) || aliasByKey.get(k) || null
}

/** Yazarken öneri listesi (en fazla `limit` adet). */
export function suggest(input, limit = 6) {
  const k = normalize(input)
  if (!k) return []
  const starts = []
  const contains = []
  for (const p of provinces) {
    if (p.key.startsWith(k)) starts.push(p)
    else if (p.key.includes(k)) contains.push(p)
  }
  return [...starts, ...contains].slice(0, limit)
}

const R = 6371 // Dünya yarıçapı (km)
const toRad = (d) => (d * Math.PI) / 180

/** İki il arası kuş uçuşu (büyük daire) mesafesi, km. */
export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Türkiye içindeki en uzak iki il arası mesafeye yakın referans (Edirne <-> Hakkari ~1600km)
export const MAX_DISTANCE_KM = 1650

/* ------------------------------------------------------------------ *
 *  EN YAKIN SINIR MESAFESİ (border-to-border)
 *  İki ilin sınırları arasındaki en kısa mesafe (km).
 *  Komşu (sınırdaş) illerde ~0 km çıkar.
 * ------------------------------------------------------------------ */

// Küre yarıçapı (km)
const R_EARTH = 6371

// lon/lat -> küre üzerinde 3B kartezyen (km). Enlem çarpıtması yok.
function toXYZ(lon, lat) {
  const phi = (lat * Math.PI) / 180
  const lam = (lon * Math.PI) / 180
  const cphi = Math.cos(phi)
  return [
    R_EARTH * cphi * Math.cos(lam),
    R_EARTH * cphi * Math.sin(lam),
    R_EARTH * Math.sin(phi),
  ]
}

// Polygon / MultiPolygon fark etmeksizin poligon listesine normalize et
function polygonsOf(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

// Her il için sınır halkalarını 3B kartezyen noktalara çevir (bir kez)
function build3D(feature) {
  const rings = []
  for (const poly of polygonsOf(feature.geometry)) {
    for (const ring of poly) {
      const pts = ring.map(([lon, lat]) => toXYZ(lon, lat))
      if (pts.length >= 2) rings.push(pts)
    }
  }
  return rings
}
for (const p of provinces) p._xyz = build3D(p.feature)

// 3B nokta -> doğru parçası (kiriş) mesafesi
function pointSeg3(p, a, b) {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const abz = b[2] - a[2]
  const apx = p[0] - a[0]
  const apy = p[1] - a[1]
  const apz = p[2] - a[2]
  const len2 = abx * abx + aby * aby + abz * abz
  let t = len2 ? (apx * abx + apy * aby + apz * abz) / len2 : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const dx = apx - t * abx
  const dy = apy - t * aby
  const dz = apz - t * abz
  return Math.sqrt(dx * dx + dy * dy + dz * dz) // kiriş (km)
}

// Bir nokta kümesi ile bir halka kümesinin kenarları arası min kiriş mesafesi
function minPointsToRings(pts, rings, best) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    for (const ring of rings) {
      for (let j = 0; j < ring.length - 1; j++) {
        const d = pointSeg3(p, ring[j], ring[j + 1])
        if (d < best) best = d
      }
    }
  }
  return best
}

// Kiriş mesafesini büyük daire (kuş uçuşu) yay mesafesine çevir
function chordToArc(chord) {
  return 2 * R_EARTH * Math.asin(Math.min(1, chord / (2 * R_EARTH)))
}

const _borderCache = new Map()

/**
 * İki ilin sınırları arası en kısa KUŞ UÇUŞU (büyük daire) mesafesi, km.
 * Poligonların tüm kenarları arası gerçek minimum (nokta-kenar). Komşuysa ~0.
 */
export function borderDistanceKm(a, b) {
  if (a.name === b.name) return 0
  const ck = a.name < b.name ? a.name + '|' + b.name : b.name + '|' + a.name
  const hit = _borderCache.get(ck)
  if (hit !== undefined) return hit
  const ptsA = a._xyz.flat()
  const ptsB = b._xyz.flat()
  let best = minPointsToRings(ptsA, b._xyz, Infinity)
  best = minPointsToRings(ptsB, a._xyz, best)
  const arc = chordToArc(best)
  _borderCache.set(ck, arc)
  return arc
}

// Sınırdaş sayılma eşiği (km) - ortak sınır koordinatları çakıştığından ~0 çıkar
export const NEIGHBOR_EPS_KM = 3

/** İki il sınırdaş (komşu) mı? */
export function areNeighbors(a, b) {
  if (a.name === b.name) return false
  return borderDistanceKm(a, b) <= NEIGHBOR_EPS_KM
}

// En uzak iki ilin kuş uçuşu sınır mesafesi (Edirne <-> Hakkari ~1470km) - palet kalibrasyonu
export const MAX_BORDER_KM = 1470
