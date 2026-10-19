import DailyNext from './DailyNext'
import { useState } from 'react'
import { avgGuesses, winPct, DIST_BUCKETS, bucketIndex } from '../lib/stats'

/**
 * İstatistik popup'ı. Günlük / Sınırsız ayrı; üstte sekme ile geçilir.
 * Günlük sekmesinde ayrıca günün sonucu kartı gösterilir.
 */
export default function StatsModal({
  stats,
  practiceStats,
  daily,
  dailyAnswer,
  finished,
  mode,
  onClose,
  onPrimary,
  onShare,
  shareLabel,
}) {
  const [tab, setTab] = useState(mode === 'practice' ? 'practice' : 'daily')
  const s = tab === 'practice' ? practiceStats : stats

  const summary = [
    ['Oynanan', s.gamesPlayed],
    ['Kazanma yüzdesi', winPct(s)],
    ['Güncel seri', s.currentStreak],
    ['En uzun seri', s.maxStreak],
    ['Ortalama tahmin', avgGuesses(s)],
    ['En iyi', s.bestGuesses || '-'],
  ]

  const maxDist = Math.max(1, ...s.dist)
  const activeBucket = tab === 'daily' && daily.won ? bucketIndex(daily.count) : -1

  let todayText
  if (daily.finished && daily.won) {
    todayText = (
      <>
        Gizemli Şehir <b>{dailyAnswer}</b> - <b>{daily.count}</b> tahminde buldun!
      </>
    )
  } else if (daily.finished) {
    todayText = (
      <>
        Bulamadın. Doğru cevap: <b>{dailyAnswer}</b>
      </>
    )
  } else if (daily.count > 0) {
    todayText = (
      <>
        Henüz bulamadın, <b>{daily.count}</b> tahmin yaptın.
      </>
    )
  } else {
    todayText = <>Günün şehrini henüz tahmin etmedin.</>
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="İstatistikler"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={onClose} aria-label="Kapat">
          ×
        </button>

        <h2 className="modal-title">İstatistikler</h2>

        {/* Günlük / Sınırsız sekmesi */}
        <div className="stat-tabs">
          <button
            className={tab === 'daily' ? 'active' : ''}
            onClick={() => setTab('daily')}
          >
            Günlük
          </button>
          <button
            className={tab === 'practice' ? 'active' : ''}
            onClick={() => setTab('practice')}
          >
            Sınırsız
          </button>
        </div>

        {/* Günün sonucu (yalnızca Günlük) */}
        {tab === 'daily' && (
          <div className={'today-card' + (daily.finished && daily.won ? ' win' : '')}>
            <span className="today-label">GÜNÜN ŞEHRİ</span>
            <span className="today-result">{todayText}</span>
          </div>
        )}

        {/* Özet kutuları */}
        <div className="stat-grid">
          {summary.map(([label, value]) => (
            <div className="stat-box" key={label}>
              <span className="stat-num">{value}</span>
              <span className="stat-cap">{label}</span>
            </div>
          ))}
        </div>

        <h3 className="dist-title">Tahmin dağılımı</h3>
        <div className="dist">
          {DIST_BUCKETS.map((b, i) => (
            <div className="dist-row" key={b.label}>
              <span className="dist-label">{b.label}</span>
              <div className="dist-track">
                <div
                  className={'dist-bar' + (i === activeBucket ? ' active' : '')}
                  style={{ width: `${(s.dist[i] / maxDist) * 100}%` }}
                >
                  <span className="dist-count">{s.dist[i]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {((tab === 'daily' && daily.finished) || finished) && <div className="modal-actions">
          {tab === 'daily' && daily.finished && (
            <button className="modal-btn" onClick={onShare}>
              {shareLabel}
            </button>
          )}
          {finished && (
            <button className="modal-btn ghost" onClick={onPrimary}>
              {mode === 'daily' ? 'Pratik' : 'Yeni oyun'}
            </button>
          )}
        </div>}
        {tab === 'daily' && daily.finished && <DailyNext />}
      </div>
    </div>
  )
}
