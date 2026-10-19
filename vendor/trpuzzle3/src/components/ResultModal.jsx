/** Sınırsız mod sonuç popup'ı (günün istatistiğinden ayrı). */
export default function ResultModal({ won, answer, count, onNewGame, onClose }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Sonuç"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={onClose} aria-label="Kapat">
          ×
        </button>

        <h2 className="modal-title">{won ? 'Tebrikler!' : 'Oyun bitti'}</h2>

        <p className="result-text">
          {won ? (
            <>
              Gizemli Şehir <b>{answer}</b> - <b>{count}</b> tahminde buldun!
            </>
          ) : (
            <>
              Doğru cevap: <b>{answer}</b>
            </>
          )}
        </p>

        <div className="modal-actions">
          <button className="modal-btn wide" onClick={onNewGame}>
            Yeni oyun
          </button>
        </div>
      </div>
    </div>
  )
}
