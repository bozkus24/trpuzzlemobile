/** Ayarlar popup'ı: Tema (açık/koyu) ve Renk körü modu. */
export default function SettingsModal({
  onClose,
  colorBlind,
  onToggleColorBlind,
  dark,
  onSetDark,
}) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Ayarlar"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={onClose} aria-label="Kapat">
          ×
        </button>

        <h2 className="modal-title settings-title">Ayarlar</h2>

        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-name">Tema</span>
            <span className="setting-desc">Koyu veya açık.</span>
          </div>
          <div className="setting-select">
            <select
              value={dark ? 'dark' : 'light'}
              onChange={(e) => onSetDark(e.target.value === 'dark')}
              aria-label="Tema"
            >
              <option value="light">Açık</option>
              <option value="dark">Koyu</option>
            </select>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="chev">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-name">Renk körü modu</span>
          </div>
          <button
            className={'toggle' + (colorBlind ? ' on' : '')}
            role="switch"
            aria-checked={colorBlind}
            aria-label="Renk körü modu"
            onClick={onToggleColorBlind}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>
    </div>
  )
}
