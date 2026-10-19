import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import TurkeyMap from './components/TurkeyMap'
import GuessInput from './components/GuessInput'
import StatsModal from './components/StatsModal'
import HowToModal from './components/HowToModal'
import SettingsModal from './components/SettingsModal'
import ModeModal from './components/ModeModal'
import ResultModal from './components/ResultModal'
import { findProvince, MAX_BORDER_KM } from './lib/provinces'
import {
  todayKey,
  puzzleNo,
  proximity,
  heatColor,
  targetColorFor,
} from './lib/game'
import {
  loadStats,
  recordDailyWin,
  recordDailyLoss,
  loadPracticeStats,
  recordPracticeWin,
  recordPracticeLoss,
} from './lib/stats'
import logoDark from './logo-dark.png'

const DAILY_STORE = (key) => `iller-globle:daily:${key}`
const MAX_GUESSES = 12 // 12 tahminde bilinemezse şehir gösterilir

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
function formatDateTR(key) {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${AYLAR[m - 1]} ${y}`
}

export default function App() {
  const [mode, setMode] = useState('daily') // 'daily' | 'practice'
  const [showModeModal, setShowModeModal] = useState(false)
  const dateKey = useMemo(() => todayKey(), [])

  // Hedef il moda göre
  const [target,setTarget]=useState(null)
  const [evaluations,setEvaluations]=useState([])
  const [remoteBusy,setRemoteBusy]=useState(true)
  const [remoteError,setRemoteError]=useState('')
  const [round,setRound]=useState(0)
  const remote=useRef(null),remotePending=useRef(false),remoteGeneration=useRef(0)
  const applyView=(v)=>{setTarget(v.answer?findProvince(v.answer):null);setEvaluations(v.evaluations.map(e=>({...e,province:findProvince(e.name)})));setGuesses(v.guesses.map(findProvince));setWon(v.win);setGaveUp(v.done&&!v.win)}

  const [guesses, setGuesses] = useState([]) // il nesneleri (tahmin sırası)
  const [won, setWon] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)

  // Görünüm ayarı: sıralama (tahmin sırası mı, yakınlık mı)
  const [byGuessOrder, setByGuessOrder] = useState(false)

  // Son yazılan şehir 2 sn yanıp söner
  const [blinkName, setBlinkName] = useState(null)
  const blinkTimer = useRef(null)
  const startBlink = useCallback((name) => {
    setBlinkName(name)
    if (blinkTimer.current) clearTimeout(blinkTimer.current)
    blinkTimer.current = setTimeout(() => setBlinkName(null), 1200)
  }, [])

  // İstatistik popup'ı (günlük + sınırsız ayrı)
  const [stats, setStats] = useState(() => loadStats())
  const [practiceStats, setPracticeStats] = useState(() => loadPracticeStats())
  const [showStats, setShowStats] = useState(false)
  // Sınırsız mod sonuç popup'ı
  const [showResult, setShowResult] = useState(false)

  // "Nasıl Oynanır" popup'ı - ilk açılışta göster (bir daha gösterme seçilmediyse)
  const HOWTO_KEY = 'iller-globle:howto-hidden'
  const [dontShowHowTo, setDontShowHowTo] = useState(() => {
    try {
      return localStorage.getItem(HOWTO_KEY) === '1'
    } catch {
      return false
    }
  })
  const [showHowTo, setShowHowTo] = useState(() => {
    try {
      return localStorage.getItem(HOWTO_KEY) !== '1'
    } catch {
      return true
    }
  })
  // ? ikonundan elle açıldı mı (o zaman "bir daha gösterme" gösterilmez)
  const [howToManual, setHowToManual] = useState(false)

  // Ayarlar + renk körü modu
  const CB_KEY = 'iller-globle:colorblind'
  const [showSettings, setShowSettings] = useState(false)
  const [colorBlind, setColorBlind] = useState(() => {
    try {
      return localStorage.getItem(CB_KEY) === '1'
    } catch {
      return false
    }
  })
  function toggleColorBlind() {
    setColorBlind((v) => {
      const next = !v
      try {
        localStorage.setItem(CB_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  // Karanlık mod
  const THEME_KEY = 'iller-globle:theme'
  const cihazKoyu = () => {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    } catch {
      return false
    }
  }
  // Kayıtlı tercih varsa o, yoksa cihazın teması
  const [dark, setDark] = useState(() => {
    try {
      const k = localStorage.getItem(THEME_KEY)
      if (k === 'dark' || k === 'light') return k === 'dark'
    } catch {}
    return cihazKoyu()
  })
  // Otomatik (cihazdan gelen) tema kaydedilmez; yalnızca kullanıcı seçerse kaydedilir
  const temaSecildi = useRef(false)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    if (!temaSecildi.current) return
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    } catch {}
  }, [dark])
  // Kullanıcı elle seçmediyse cihaz teması değişince site de uyar
  useEffect(() => {
    if (temaSecildi.current) return
    let mq
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const f = (e) => { if (!temaSecildi.current) setDark(e.matches) }
    mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', f) : mq.removeListener(f) }
  }, [])
  const temayiSec = (v) => { temaSecildi.current = true; setDark(v) }
  function toggleDontShowHowTo() {
    setDontShowHowTo((v) => {
      const next = !v
      try {
        localStorage.setItem(HOWTO_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  useEffect(()=>{
    const generation=++remoteGeneration.current;remotePending.current=true;setRemoteBusy(true);setRemoteError('');
    let saved=null;
    if(mode==='daily'){try{saved=JSON.parse(localStorage.getItem(DAILY_STORE(dateKey)))}catch{}}
    const options={date:dateKey,mode};
    if(mode==='practice'&&round>0&&remote.current?.view.answer)options.exclude=remote.current.view.answer;
    if(saved?.token)options.token=saved.token;
    else if(saved?.guesses?.length){options.legacyMoves=[...saved.guesses];if(saved.gaveUp&&saved.guesses.length<MAX_GUESSES)options.legacyMoves.push('giveup')}
    window.TrPuzzleRemote.open('sehirle',options).then(session=>{
      if(generation!==remoteGeneration.current)return;
      remote.current=session;applyView(session.view);
      try {
      if(mode==='daily')localStorage.setItem(DAILY_STORE(dateKey),JSON.stringify({guesses:session.view.guesses,won:session.view.win,gaveUp:session.view.done&&!session.view.win,token:session.token,answer:session.view.answer||null}));
      } catch {}
    }).catch(e=>{if(generation===remoteGeneration.current)setRemoteError(e.message)})
      .finally(()=>{if(generation===remoteGeneration.current){remotePending.current=false;setRemoteBusy(false)}});
    return ()=>{remoteGeneration.current++};
  },[mode,dateKey,round])

  // Günün ili ilerlemesini kaydet
  const persistDaily = useCallback(
    (gs, w, g) => {
      try {
        localStorage.setItem(
          DAILY_STORE(dateKey),
          JSON.stringify({ guesses: gs.map((p) => p.name), won: w, gaveUp: g,token:remote.current?.token,answer:remote.current?.view.answer||null })
        )
      } catch {}
    },
    [dateKey]
  )

  const finished = won || gaveUp

  const handleGuess = useCallback(
    async (province) => {
      if (finished||remotePending.current||!remote.current) return false
      if (guesses.some((g) => g.name === province.name)) return
      const generation=remoteGeneration.current;remotePending.current=true;setRemoteBusy(true);setRemoteError('');
      let view;
      try{view=await window.TrPuzzleRemote.move(remote.current,province.name)}
      catch(e){if(generation===remoteGeneration.current)setRemoteError(e.message);return false}
      finally{if(generation===remoteGeneration.current){remotePending.current=false;setRemoteBusy(false)}}
      if(generation!==remoteGeneration.current)return false;
      applyView(view);
      const next = view.guesses.map(findProvince)
      setGuesses(next)
      startBlink(province.name)
      const isWin = view.win
      // 12 tahminde bilinemezse şehir gösterilir (oyun biter)
      const outOfGuesses = !isWin && next.length >= MAX_GUESSES
      if (isWin) {
        setWon(true)
        if (mode === 'daily') {
          persistDaily(next, true, false)
          setStats(recordDailyWin(dateKey, next.length))
          setShowStats(true)
        } else {
          setPracticeStats(recordPracticeWin(next.length))
          setShowResult(true)
        }
      } else if (outOfGuesses) {
        setGaveUp(true)
        if (mode === 'daily') {
          persistDaily(next, false, true)
          setStats(recordDailyLoss(dateKey))
          setShowStats(true)
        } else {
          setPracticeStats(recordPracticeLoss())
          setShowResult(true)
        }
      } else if (mode === 'daily') {
        persistDaily(next, false, false)
      }
      return true
    },
    [finished, guesses, mode, persistDaily, dateKey, startBlink]
  )

  // En yakın sınır mesafesine göre yakınlık ve renk
  const evals = useMemo(
    () =>
      evaluations.map((e) => {
        const prox = proximity(e.borderKm, MAX_BORDER_KM)
        return { ...e, dist: e.borderKm, prox, color: heatColor(prox, e.isTarget, colorBlind) }
      }),
    [evaluations, colorBlind]
  )

  // Harita için renk eşlemesi
  const colors = useMemo(() => {
    const m = {}
    for (const e of evals) m[e.province.name] = e.color
    return m
  }, [evals])

  // Yakınlığa göre sıralı (doğru il en üstte)
  const byDist = useMemo(
    () =>
      [...evals].sort(
        (a, b) => (b.isTarget ? 1 : 0) - (a.isTarget ? 1 : 0) || a.dist - b.dist
      ),
    [evals]
  )
  const display = byGuessOrder ? evals : byDist
  // Bilgi satırı EN YAKIN (minimum sınır mesafesi) ile göre
  const closest = byDist.length ? byDist[0] : null

  // Günün ili sonucu (mod ne olursa olsun localStorage'dan)
  let dailyAnswer='';try{dailyAnswer=JSON.parse(localStorage.getItem(DAILY_STORE(dateKey)))?.answer||''}catch{}
  const daily = useMemo(() => {
    try {
      const raw = localStorage.getItem(DAILY_STORE(dateKey))
      if (!raw) return { played: false, finished: false, won: false, count: 0 }
      const data = JSON.parse(raw)
      const count = (data.guesses || []).length
      const w = !!data.won
      const g = !!data.gaveUp
      return { played: count > 0, finished: w || g, won: w, gaveUp: g, count }
    } catch {
      return { played: false, finished: false, won: false, count: 0 }
    }
    // showStats/guesses/won/gaveUp değişince tazele
  }, [dateKey, guesses, won, gaveUp, showStats])

  function newPractice() {
    setRound(r=>r+1)
    setGuesses([])
    setWon(false)
    setGaveUp(false)
    setShowStats(false)
    setShowResult(false)
  }

  async function giveUp() {
    if(remotePending.current||!remote.current||finished)return;
    const generation=remoteGeneration.current;remotePending.current=true;setRemoteBusy(true);
    try{const v=await window.TrPuzzleRemote.move(remote.current,'giveup');if(generation!==remoteGeneration.current)return;applyView(v)}
    catch(e){if(generation===remoteGeneration.current)setRemoteError(e.message);return}
    finally{if(generation===remoteGeneration.current){remotePending.current=false;setRemoteBusy(false)}}
    setGaveUp(true)
    if (mode === 'daily') {
      persistDaily(guesses, false, true)
      setStats(recordDailyLoss(dateKey))
      setShowStats(true)
    } else {
      setPracticeStats(recordPracticeLoss())
      setShowResult(true)
    }
  }

  function switchMode(m) {
    setMode(m)
    setShowStats(false)
    setShowResult(false)
    if (m === 'practice') {
      setGuesses([])
      setWon(false)
      setGaveUp(false)

    }
  }

  function onModalPrimary() {
    if (mode === 'daily') switchMode('practice')
    else newPractice()
    setShowStats(false)
  }

  const [copied, setCopied] = useState(false)
  function share() {
    if (!daily.finished) return
    // Her zaman GÜNÜN sonucunu paylaş
    const head = `Şehirle #${puzzleNo(dateKey)}`
    let result
    if (daily.finished && daily.won) result = `Günün şehrini ${daily.count} tahminde buldum✅️`
    else if (daily.finished) result = `Günün şehrini bulamadım❌️`
    else if (daily.count > 0) result = `Günün şehrini arıyorum… (${daily.count} tahmin)`
    else result = `Günün şehrini tahmin etmeye başladım!`
    const text = `${head}\n\n${result}\n\nSen kaç tahminde bulabilirsin ?`
    const url = 'https://trpuzzle.com/sehirle/'
    const kopyala = () =>
      navigator.clipboard?.writeText(`${text}\n\n${url}`).then(
        () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        },
        () => {}
      )
    // Tek buton: destekleyen cihazda sistem paylaş menüsünü açar (WhatsApp, X,
    // Instagram, Telegram, kopyala…); desteklenmeyen yerde panoya kopyalar.
    // Adres ayrı alanda gönderilince uygulamalar metnin sonuna boşlukla
    // ekliyordu; kendi satırında dursun diye metnin içine konuyor.
    if (navigator.share) {
      navigator
        .share({ text: `${text}\n\n${url}` })
        .catch((hata) => {
          if (hata && hata.name === 'AbortError') return // kullanıcı iptal etti
          kopyala()
        })
      return
    }
    kopyala()
  }

  const guessedNames = useMemo(() => new Set(guesses.map((g) => g.name)), [guesses])

  // Son tahmine göre "daha sıcak / daha soğuk" geri bildirimi (butonun altında)
  const feedback = useMemo(() => {
    if (!evals.length) return { text: 'Bir şehir adı yaz ve tahmine başla.', tone: 'hint' }
    const last = evals[evals.length - 1]
    if (last.isTarget) return { text: `${last.province.name} doğru!`, tone: 'hit' }
    const word = (p) =>
      p >= 0.8 ? 'çok sıcak' : p >= 0.6 ? 'sıcak' : p >= 0.4 ? 'ılık' : p >= 0.2 ? 'soğuk' : 'çok soğuk'
    if (evals.length === 1) {
      return {
        text: `${last.province.name}: ${word(last.prox)}`,
        tone: last.prox >= 0.5 ? 'hot' : 'cold',
      }
    }
    const prev = evals[evals.length - 2]
    if (last.prox > prev.prox + 0.0005)
      return { text: `${last.province.name} daha sıcak`, tone: 'hot' }
    if (last.prox < prev.prox - 0.0005)
      return { text: `${last.province.name} daha soğuk`, tone: 'cold' }
    return { text: `${last.province.name} aynı sıcaklıkta`, tone: 'hint' }
  }, [evals])

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <a className="brand-group" href="/" aria-label="Ana sayfaya dön" title="Ana sayfa">
            <img className="logo" src={logoDark} alt="Şehirle logo" />
            <span className="brand">ŞEHİRLE</span>
          </a>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={() => setShowModeModal(true)}
              aria-label="Oyun modu"
              title="Oyun modu"
            >
              {mode === 'daily' ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="3.5"
                    y="5"
                    width="17"
                    height="15.5"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M8 3v4M16 3v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9.83 9.17a4 4 0 1 0 0 5.66 10 10 0 0 0 2.17-2.83 10 10 0 0 1 2.17-2.83 4 4 0 1 1 0 5.66 10 10 0 0 1-2.17-2.83 10 10 0 0 0-2.17-2.83"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowStats(true)}
              aria-label="İstatistikler"
              title="İstatistikler"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="11" width="4.2" height="9" rx="2.1" fill="currentColor" />
                <rect x="9.9" y="4" width="4.2" height="16" rx="2.1" fill="currentColor" />
                <rect x="15.8" y="8" width="4.2" height="12" rx="2.1" fill="currentColor" />
              </svg>
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setHowToManual(true)
                setShowHowTo(true)
              }}
              aria-label="Nasıl Oynanır"
              title="Nasıl Oynanır"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M9.2 9.3c0-1.6 1.3-2.7 2.9-2.7 1.6 0 2.8 1 2.8 2.5 0 1.3-.8 1.9-1.8 2.5-.9.6-1.2 1-1.2 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="11.9" cy="17" r="1.2" fill="currentColor" />
              </svg>
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Ayarlar"
              title="Ayarlar"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M10.32 4.32c.43-1.76 2.93-1.76 3.36 0a1.72 1.72 0 0 0 2.57 1.06c1.54-.94 3.31.83 2.37 2.37a1.72 1.72 0 0 0 1.06 2.57c1.76.43 1.76 2.93 0 3.36a1.72 1.72 0 0 0-1.06 2.57c.94 1.54-.83 3.31-2.37 2.37a1.72 1.72 0 0 0-2.57 1.06c-.43 1.76-2.93 1.76-3.36 0a1.72 1.72 0 0 0-2.57-1.06c-1.54.94-3.31-.83-2.37-2.37a1.72 1.72 0 0 0-1.06-2.57c-1.76-.43-1.76-2.93 0-3.36a1.72 1.72 0 0 0 1.06-2.57c-.94-1.54.83-3.31 2.37-2.37 1 .61 2.3.07 2.57-1.06z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="app">

      {mode !== 'daily' && (
        <div className="game-header">
          {`Sınırsız #${finished ? practiceStats.gamesPlayed : practiceStats.gamesPlayed + 1}`}
        </div>
      )}

      {/* Tahmin kutusu haritanın ÜSTÜNDE; geri bildirim butonun altında */}
      {!finished ? (
        <>
          <GuessInput onGuess={handleGuess} disabled={finished||remoteBusy||!remote.current} guessedNames={guessedNames} />
          <div className={'feedback ' + feedback.tone}>{remoteBusy?'Oyun kontrol ediliyor…':feedback.text}</div>
          {remoteError&&<div role="alert">{remoteError}<button onClick={()=>setRound(r=>r+1)}>Yeniden bağlan</button></div>}
        </>
      ) : (
        !showStats && (
          <div className="reveal-banner" style={{ color: targetColorFor(colorBlind) }}>
            Gizemli Şehir {target?.name||''}!
          </div>
        )
      )}

      <TurkeyMap
        colors={colors}
        target={target}
        revealed={finished}
        targetColor={targetColorFor(colorBlind)}
        blink={blinkName}
      />

      {guesses.length > 0 && (
        <section className="panel">
          <div className="panel-head">En yakın</div>

          <div className="name-list">
            {display.map((e) => (
              <span key={e.province.name} className={e.isTarget ? 'nm hit' : 'nm'}>
                {e.province.name}
              </span>
            ))}
          </div>

          <div className="controls">
            <span className="metric">
              En yakın sınır: <b>{closest ? `${closest.dist} km` : '-'}</b>
            </span>

            <button className="linkbtn" onClick={() => setByGuessOrder((v) => !v)}>
              {byGuessOrder ? 'Yakınlığa göre sırala' : 'Tahmin sırasına göre sırala'}
            </button>
          </div>

          {!finished && (
            <button className="reveal-btn" onClick={giveUp}>
              Cevabı göster
            </button>
          )}
        </section>
      )}

      {showStats && (
        <StatsModal
          stats={stats}
          practiceStats={practiceStats}
          daily={daily}
          dailyAnswer={dailyAnswer}
          finished={finished}
          mode={mode}
          onClose={() => setShowStats(false)}
          onPrimary={onModalPrimary}
          onShare={share}
          shareLabel={copied ? 'Kopyalandı' : 'Paylaş'}
        />
      )}

      {showResult && mode === 'practice' && (
        <ResultModal
          won={won}
          answer={target?.name||''}
          count={guesses.length}
          onNewGame={newPractice}
          onClose={() => setShowResult(false)}
        />
      )}

      {showHowTo && (
        <HowToModal
          showDontShow={!howToManual}
          dontShow={dontShowHowTo}
          onToggleDontShow={toggleDontShowHowTo}
          onClose={() => {
            setShowHowTo(false)
            setHowToManual(false)
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          colorBlind={colorBlind}
          onToggleColorBlind={toggleColorBlind}
          dark={dark}
          onSetDark={temayiSec}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showModeModal && (
        <ModeModal
          mode={mode}
          onSelect={(m) => {
            switchMode(m)
            setShowModeModal(false)
          }}
          onClose={() => setShowModeModal(false)}
        />
      )}
      </div>
    </>
  )
}
