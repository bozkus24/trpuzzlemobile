import { useMemo } from 'react'
import { geoPath, geoTransform } from 'd3-geo'
import { geo } from '../lib/provinces'
import { TARGET_COLOR } from '../lib/game'
// targetColor prop ile renk körü modunda mavi hedef desteklenir
import { SAT_BOUNDS, SAT_RELIEF } from '../data/satellite'
import { LAND } from '../data/land'

const { west, east, north, south } = SAT_BOUNDS
const HEIGHT = 440
// Doğal en-boy: boylamı orta enlemin kosinüsüyle sıkıştır (Mercator hissi)
const latMid = ((north + south) / 2) * (Math.PI / 180)
const WIDTH = Math.round(
  (HEIGHT * (east - west) * Math.cos(latMid)) / (north - south)
)
const DEPTH = 4 // 3B kabarma yüksekliği (px)

// lon/lat -> uydu görselinin piksel kutusuyla birebir aynı doğrusal eşleme
const projection = geoTransform({
  point(lon, lat) {
    const x = ((lon - west) / (east - west)) * WIDTH
    const y = ((north - lat) / (north - south)) * HEIGHT
    this.stream.point(x, y)
  },
})
const pathGen = geoPath(projection)

function darken(c, f) {
  const m = c.match(/\d+/g)
  const [r, g, b] = m ? m.slice(0, 3).map(Number) : [20, 20, 20]
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`
}

/**
 * Gerçekçi uydu zeminli Türkiye haritası.
 * Uydu görseli il siluetine kırpılır (kıyı keskin), üstüne 3B boyalı iller gelir.
 */
export default function TurkeyMap({
  colors = {},
  target = null,
  revealed = false,
  targetColor = TARGET_COLOR,
  blink = null,
}) {
  const { paths, cy } = useMemo(() => {
    const paths = geo.features.map((f) => ({ name: f.properties.name, d: pathGen(f) }))
    const cy = {}
    for (const f of geo.features) cy[f.properties.name] = pathGen.centroid(f)[1]
    return { paths, cy }
  }, [])

  // Kara maskesi (Türkiye + komşular) - relief'i karaya kırpar, deniz mavi kalır
  const landPath = useMemo(
    () => pathGen({ type: 'MultiPolygon', coordinates: LAND }),
    []
  )

  const raised = useMemo(() => {
    const nameSet = new Set(
      paths
        .map((p) => p.name)
        .filter((n) => colors[n] || (revealed && target && n === target.name))
    )
    const list = paths
      .filter((p) => nameSet.has(p.name))
      .map((p) => {
        const isTarget = revealed && target && p.name === target.name
        const top = isTarget ? targetColor : colors[p.name]
        return { ...p, top, side: darken(top, 0.45), outline: '#000000' }
      })
    return list.sort((a, b) => cy[a.name] - cy[b.name])
  }, [paths, colors, target, revealed, targetColor, cy])

  return (
    <div className="map-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="tr-map"
        role="img"
        aria-label="Türkiye uydu haritası"
      >
        <defs>
          <clipPath id="land-mask">
            <path d={landPath} />
          </clipPath>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
          </filter>
          {/* Türkiye ulusal sınır bandı. Önce dilate ile il-arası dikişleri KAPAT
              (yoksa erode iç çizgilere dönüşür), sonra kapalı siluetten dış bant. */}
          <filter id="tr-border" x="-5%" y="-5%" width="110%" height="110%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="closed" />
            <feMorphology in="closed" operator="erode" radius="1.4" result="inner" />
            <feComposite in="closed" in2="inner" operator="out" result="ring" />
            <feFlood floodColor="#0b0b0b" result="col" />
            <feComposite in="col" in2="ring" operator="in" />
          </filter>
        </defs>

        {/* Deniz zemini */}
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#2f6fb2" />

        {/* Kabartma zemin, karaya kırpılı: Türkiye + komşu kara; deniz mavi kalır */}
        <image
          href={SAT_RELIEF}
          x="0"
          y="0"
          width={WIDTH}
          height={HEIGHT}
          preserveAspectRatio="none"
          clipPath="url(#land-mask)"
        />

        {/* Türkiye ulusal sınırı - belirgin koyu bant */}
        <g filter="url(#tr-border)" opacity="0.9">
          {paths.map((p) => (
            <path key={'b-' + p.name} d={p.d} fill="#000" />
          ))}
        </g>

        {/* Yükseltilmiş katman: boyalı iller 3B (iki geçiş). Üst yüz gerçek
            konumunda (kıyıya oturur), derinlik AŞAĞIYA doğru (alttan görünür). */}
        <g className="raised" filter="url(#lift)">
          {raised.map((p) => (
            <g key={'s-' + p.name}>
              {Array.from({ length: DEPTH }).map((_, i) => (
                <path key={i} d={p.d} fill={p.side} transform={`translate(0, ${DEPTH - i})`} />
              ))}
            </g>
          ))}
          {raised.map((p) => (
            <path
              key={'t-' + p.name}
              className={p.name === blink ? 'prov-blink' : undefined}
              d={p.d}
              fill={p.top}
              stroke={p.outline}
              strokeWidth={1.8}
              strokeLinejoin="round"
            >
              <title>{p.name}</title>
            </path>
          ))}
        </g>
      </svg>
    </div>
  )
}
