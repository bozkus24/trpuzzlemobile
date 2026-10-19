/** Oyun modu seçimi popup'ı: Günün Şehri (takvim) / Sınırsız Pratik (sonsuzluk). */

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mode-ico">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function InfinityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mode-ico inf">
      <path
        d="M9.83 9.17a4 4 0 1 0 0 5.66 10 10 0 0 0 2.17-2.83 10 10 0 0 1 2.17-2.83 4 4 0 1 1 0 5.66 10 10 0 0 1-2.17-2.83 10 10 0 0 0-2.17-2.83"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ModeModal({ mode, onSelect, onClose }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Oyun modu"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={onClose} aria-label="Kapat">
          ×
        </button>

        <h2 className="modal-title">Oyun modu</h2>

        <div className="mode-options">
          <button
            className={'mode-option' + (mode === 'daily' ? ' active' : '')}
            onClick={() => onSelect('daily')}
          >
            <CalendarIcon />
            Günün Şehri
          </button>
          <button
            className={'mode-option' + (mode === 'practice' ? ' active' : '')}
            onClick={() => onSelect('practice')}
          >
            <InfinityIcon />
            Sınırsız
          </button>
        </div>
      </div>
    </div>
  )
}
