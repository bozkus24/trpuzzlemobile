import { useState } from 'react'
import { findProvince } from '../lib/provinces'

export default function GuessInput({ onGuess, disabled, guessedNames }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    if(disabled)return;
    const p = findProvince(value)
    if (!p) {
      setError('Böyle bir şehir bulunamadı')
      return
    }
    if (guessedNames?.has(p.name)) {
      setError(`${p.name} zaten tahmin edildi`)
      return
    }
    if(await onGuess(p)===false)return
    setValue('')
    setError('')
  }

  return (
    <div className="guess-box">
      <div className="guess-row">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          placeholder="Şehir adını yaz… (örn. Ankara)"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          aria-label="Şehir tahmini"
          className={error ? 'invalid' : ''}
        />
        <button className="guess-btn" onClick={submit} disabled={disabled}>
          Tahmin
        </button>
      </div>
      {error && <div className="guess-error">{error}</div>}
    </div>
  )
}
