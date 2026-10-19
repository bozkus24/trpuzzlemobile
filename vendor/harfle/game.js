/* ================= TDK Wordle - Türkçe ================= */

/* Türk alfabesi (büyük harf, sıralı) */
const TR_ALPHABET = ["A","B","C","Ç","D","E","F","G","Ğ","H","I","İ","J","K","L","M",
                     "N","O","Ö","P","R","S","Ş","T","U","Ü","V","Y","Z"];

/* Klavye düzeni (Türkçe) */
const KB_ROWS = [
  ["E","R","T","Y","U","I","O","P","Ğ","Ü"],
  ["A","S","D","F","G","H","J","K","L","Ş","İ"],
  ["ENTER","Z","C","V","B","N","M","Ö","Ç","SIL"]
];

const ROWS = 6, COLS = 5;

/* SVG ikonlar (emoji yerine) */
const _S = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const _F = p => `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${p}</svg>`;
const SVG = {
  play:    _F('<path d="M8 5.5v13l10-6.5z"/>'),
  check:   _S('<path d="M20 6.5L9.2 17.3 4 12.1"/>'),
  cross:   _S('<path d="M18 6L6 18M6 6l12 12"/>'),
  trophy:  _S('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5v1a3 3 0 0 0 3 3"/><path d="M17 6h2.5v1a3 3 0 0 1-3 3"/><path d="M12 14v3.5"/><path d="M8.5 21h7"/><path d="M9.7 17.5h4.6l.6 3.5H9.1z" fill="currentColor" stroke="none"/>'),
  star:    _S('<path d="M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.4 9.3l5.8-.8z"/>'),
  thumb:   _S('<path d="M7 10.5V20H4V10.5z"/><path d="M7 10.5l3.6-6.8A1.8 1.8 0 0 1 14 4.6V9h4.4a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17.2 19H7z"/>'),
  neutral: _S('<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7"/><circle cx="9" cy="10.2" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.2" r="0.9" fill="currentColor" stroke="none"/>'),
  sad:     _S('<circle cx="12" cy="12" r="9"/><path d="M8.4 16a4 4 0 0 1 7.2 0"/><circle cx="9" cy="10.2" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.2" r="0.9" fill="currentColor" stroke="none"/>'),
  backspace: _S('<path d="M21 5H8.4a2 2 0 0 0-1.5.7L2.6 11a1.4 1.4 0 0 0 0 1.9l4.3 5.3a2 2 0 0 0 1.5.8H21a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>'),
  sun:     _S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/>'),
  moon:    _S('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>')
};

/* Oyunun başlangıç günü - 1. bulmaca bu gün. */
const EPOCH = new Date(2026, 9, 1);           // 1 Ağustos 2026
const ARCHIVE_START = new Date(2026, 9, 1); // 1 Ekim 2026

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                   "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

/* ---------- yardımcılar ---------- */
const up = s => s.toLocaleUpperCase("tr-TR");
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a,b) => Math.round((startOfDay(a)-startOfDay(b))/86400000);
const puzzleNo = d => dayDiff(d, EPOCH);            // 0-based -> +1 gösterirken
const formatTR = d => `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${TR_DAYS[d.getDay()]} ${d.getFullYear()}`;
const formatTRShort = d => `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;   // günsüz

/* Sabit tohumlu karıştırma (her gün benzersiz, öncekilerden farklı kelime) */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seededPerm(arr, seed){
  const a=arr.slice(); const rnd=mulberry32(seed);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
// Daily answers and their permutation now live only in the server catalog.

/* ---------- durum (localStorage) ---------- */
const store = {
  get(key){ try{return JSON.parse(localStorage.getItem("trw-"+key));}catch(e){return null;} },
  set(key,val){ try{localStorage.setItem("trw-"+key, JSON.stringify(val));}catch(e){} }
};

/* ---------- ekran yönetimi ---------- */
const screens = ["archive","game"];
function show(id){
  screens.forEach(s=>document.getElementById(s).classList.toggle("hidden", s!==id));
  document.body.classList.toggle("archive-open", id==="archive");
  if(id==="archive") buildArchive();
}
document.addEventListener("click", e=>{
  // yalnızca ekran değiştir (aktif oyuna dön)
  const back = e.target.closest("[data-show]");
  if(back){ closeModal(); show(back.getAttribute("data-show")); return; }
  // günlük oyunu aç/yenile veya başka ekrana git
  const t = e.target.closest("[data-go]");
  if(!t) return;
  const dest = t.getAttribute("data-go");
  if(dest==="game"){ startGame(TrPuzzleClock.calendar()); }
  else { if(dest!=="archive") closeModal(); show(dest); }
});

/* ================= OYUN ================= */
let current = null; // {date, key, word, guesses:[], done, win}

function loadState(key){
  const st=store.get(key);
  if(!st || !Array.isArray(st.guesses) || st.guesses.length>6 || !st.guesses.every(w=>typeof w==="string"&&/^[A-ZÇĞİÖŞÜ]{5}$/.test(w))) return {guesses:[],scores:[],done:false,win:false,word:null};
  return {...st,word:st.done&&typeof st.word==='string'?st.word:null};
}
let remoteSession=null, gameRequest=0, remotePending=false;
function saveCurrent(){store.set(current.key,{word:current.done?current.word:null,guesses:current.guesses,scores:current.scores,done:current.done,win:current.win,token:remoteSession.token});}
async function startGame(date){
  const d=startOfDay(date);
  if(dayDiff(d,TrPuzzleClock.calendar())>0)return;
  const request=++gameRequest,key=dateKey(d),saved=loadState(key);
  remotePending=true;msg('Oyun yükleniyor…');
  try{
    const options={date:key,mode:dayDiff(d,TrPuzzleClock.calendar())===0?'daily':'archive'};
    if(saved.token)options.token=saved.token;
    else if(saved.guesses.length)options.legacyMoves=saved.guesses;
    const session=await TrPuzzleRemote.open('harfle',options);
    if(request!==gameRequest)return;
    remoteSession=session;
    const v=session.view;
    current={date:d,key,word:v.answer||null,guesses:v.guesses,scores:v.scores,done:v.done,win:v.win,row:v.guesses.length,input:'',isToday:dayDiff(d,TrPuzzleClock.calendar())===0};
    saveCurrent();buildBoard();buildKeyboard();renderFromState();show('game');msg('');
    const opened=current;if(current.done)setTimeout(()=>{if(current===opened)openResult();},350);
  }catch(e){if(request===gameRequest)msg(e.message);}
  finally{if(request===gameRequest)remotePending=false;}
}

function buildBoard(){
  const b=document.getElementById("board"); b.innerHTML="";
  for(let r=0;r<ROWS;r++){
    const row=document.createElement("div"); row.className="row"; row.dataset.r=r;
    for(let c=0;c<COLS;c++){
      const t=document.createElement("div"); t.className="tile"; t.dataset.r=r; t.dataset.c=c;
      row.appendChild(t);
    }
    b.appendChild(row);
  }
}

function buildKeyboard(){
  const kb=document.getElementById("keyboard"); kb.innerHTML="";
  KB_ROWS.forEach(row=>{
    const kr=document.createElement("div"); kr.className="krow";
    row.forEach(k=>{
      const btn=document.createElement("button");
      btn.className="key"+(k==="ENTER"||k==="SIL"?" wide":"");
      if(k==="SIL"){ btn.innerHTML=SVG.backspace; }
      else { btn.textContent = k==="ENTER" ? "GİR" : k; }
      btn.dataset.key=k;
      btn.addEventListener("click",()=>handleKey(k));
      kr.appendChild(btn);
    });
    kb.appendChild(kr);
  });
}

/* renk hesabı (iki geçişli standart Wordle algoritması) */
function scoreGuess(guess, answer){
  const g=[...guess], a=[...answer];
  const res=Array(COLS).fill("absent");
  const counts={};
  a.forEach(ch=>counts[ch]=(counts[ch]||0)+1);
  for(let i=0;i<COLS;i++){ if(g[i]===a[i]){res[i]="correct"; counts[g[i]]--;} }
  for(let i=0;i<COLS;i++){
    if(res[i]==="correct") continue;
    if(counts[g[i]]>0){ res[i]="present"; counts[g[i]]--; }
  }
  return res;
}

function renderFromState(){
  // önceki tahminleri boya
  current.guesses.forEach((guess,r)=>{
    const res=current.scores[r];
    [...guess].forEach((ch,c)=>{
      const t=tile(r,c); t.textContent=ch; t.classList.add("filled",res[c]);
      paintKey(ch,res[c]);
    });
  });
  current.row=current.guesses.length;
  current.input="";
}

const tile=(r,c)=>document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);

function paintKey(ch,state){
  const btn=document.querySelector(`.key[data-key="${ch}"]`);
  if(!btn) return;
  const rank={absent:0,present:1,correct:2};
  const cur=btn.classList.contains("correct")?"correct":btn.classList.contains("present")?"present":btn.classList.contains("absent")?"absent":null;
  if(cur && rank[cur]>=rank[state]) return;
  btn.classList.remove("absent","present","correct");
  btn.classList.add(state);
}

/* ---------- giriş ---------- */
function handleKey(k){
  if(!current || current.done || remotePending) return;
  if(k==="ENTER"){ submitGuess(); return; }
  if(k==="SIL"){ if(current.input.length>0){ current.input=current.input.slice(0,-1); drawInput(); } return; }
  if(current.input.length>=COLS) return;
  if(!TR_ALPHABET.includes(k)) return;
  current.input+=k; drawInput();
}
function drawInput(){
  const r=current.row;
  for(let c=0;c<COLS;c++){
    const t=tile(r,c); const ch=current.input[c]||"";
    t.textContent=ch;
    t.classList.toggle("filled", !!ch);
  }
}

document.addEventListener("keydown",e=>{
  if(store.get("osk")===1) return;   // yalnızca ekran klavyesi girişi
  if(document.getElementById("game").classList.contains("hidden")) return;
  if(!document.getElementById("overlay").classList.contains("hidden")) return;
  if(e.key==="Enter") handleKey("ENTER");
  else if(e.key==="Backspace") handleKey("SIL");
  else{
    const ch=up(e.key);
    if(ch.length===1 && TR_ALPHABET.includes(ch)) handleKey(ch);
  }
});

async function submitGuess(){
  if(remotePending||!current||current.done)return;
  if(current.input.length<COLS){ shake(); msg("Yeterli harf yok"); return; }
  const guess=current.input;
  const lower=guess.toLocaleLowerCase("tr-TR");
  if(!ACCEPTED.has(lower)){ shake(); msg("Kelime listede yok"); return; }
  if(hardMode()){ const err=hardModeError(guess); if(err){ shake(); msg(err); return; } }

  msg("");
  const r=current.row;
  const opened=current,session=remoteSession;
  remotePending=true;
  let view;
  try{view=await TrPuzzleRemote.move(session,guess);}catch(e){msg(e.message);remotePending=false;return;}
  if(current!==opened){remotePending=false;return;}
  const res=view.scores[r];
  current.word=view.answer||null;
  current.scores=view.scores;
  // flip animasyonu
  [...guess].forEach((ch,c)=>{
    const t=tile(r,c);
    setTimeout(()=>{ t.classList.add("reveal");
      setTimeout(()=>{ t.classList.add("filled",res[c]); paintKey(ch,res[c]); },350);
    }, c*340);
  });

  current.guesses.push(guess);
  current.input="";
  current.row++;

  const win = res.every(x=>x==="correct");
  const over = win || current.row>=ROWS;
  if(over){ current.done=true; current.win=win; }
  saveCurrent();
  remotePending=false;

  if(over){
    if(current.isToday) updateStats(win, current.guesses.length);   // arşiv oyunları istatistiğe işlemez
    const delay = COLS*340 + 500 + (win?600:0);
    if(win){ setTimeout(()=>document.querySelector(`.row[data-r="${r}"]`).classList.add("win"), COLS*340+300); }
    // önce küçük popup, sonra sonuç/istatistik ekranı
    setTimeout(()=>{
      showMini();
      setTimeout(()=>{ hideMini(); openResult(); }, 1500);
    }, delay);
  }
}

/* ---------- geri bildirim ---------- */
function feedback(win, tries, word){
  if(!win) return {icon:"", cls:"bad", title:"Yarın tekrar dene!", text:`Kelime: ${word}`};
  const M = {1:"Dahi olmalısın!", 2:"Büyüleyici!", 3:"Etkileyici!", 4:"Harika!", 5:"Güzel", 6:"Fena değil..."};
  const title = M[tries] || "Tebrikler!";
  const icon = tries===5 ? SVG.thumb : "";   // yalnızca "Güzel"de SVG
  return {icon, cls:"good", title, text:""};
}

/* ---------- istatistik ---------- */
function getStats(){
  return TrPuzzleSecurity.stats(store.get("stats"), ["played","wins","streak","max"], [1,2,3,4,5,6]);
}
function updateStats(win, tries){
  const s=getStats();
  s.played++;
  if(win){
    s.wins++; s.streak++;
    if(s.streak>s.max) s.max=s.streak;
    s.dist[tries]=(s.dist[tries]||0)+1;
  } else { s.streak=0; }
  store.set("stats", s);
  return s;
}
function renderStats(){
  const s=getStats();
  document.getElementById("st-played").textContent=s.played;
  document.getElementById("st-win").textContent = s.played? Math.round(s.wins/s.played*100):0;
  document.getElementById("st-streak").textContent=s.streak;
  document.getElementById("st-max").textContent=s.max;
  const dist=document.getElementById("dist");
  const vals=[1,2,3,4,5,6].map(i=>s.dist[i]||0);
  const max=Math.max(1,...vals);
  const curTries = modalG && modalG.win ? modalG.guesses.length : -1;
  dist.innerHTML="";
  for(let i=1;i<=6;i++){
    const v=s.dist[i]||0;
    const w=Math.max(9, Math.round(v/max*100));
    const row=document.createElement("div"); row.className="dist-row";
    row.innerHTML=`<span class="dist-idx">${i}</span>`+
      `<div class="dist-bar${i===curTries?' cur':''}" style="width:${w}%">${v}</div>`;
    dist.appendChild(row);
  }
}

/* ---------- küçük ön-popup ---------- */
function showMini(){
  const fb=feedback(current.win, current.guesses.length, current.word);
  const ic=document.getElementById("mini-emoji");
  ic.innerHTML=fb.icon; ic.className="m-emoji "+fb.cls;
  ic.style.display = fb.icon ? "" : "none";   // SVG yoksa boşluk bırakma
  document.getElementById("mini-text").textContent=fb.title;
  document.getElementById("mini").classList.remove("hidden");
}
function hideMini(){ document.getElementById("mini").classList.add("hidden"); }

/* ---------- popup + paylaş ---------- */
let modalG = null;   // modalın hangi oyunu gösterdiği (current veya bugün)

function stateForDate(d){
  d=startOfDay(d);
  const key=dateKey(d);
  const st=loadState(key);
  return {...st,date:d,key,isToday:dayDiff(d,TrPuzzleClock.calendar())===0};
}

// tek render: g = gösterilecek oyun; general = genel istatistik göster; share = paylaş göster
function showModal(g, general, share){
  modalG=g;
  const done=!!g.done;
  const title=document.getElementById("modal-title");
  const text=document.getElementById("modal-text");
  if(done){
    const fb=feedback(g.win, g.guesses.length, g.word);
    title.textContent=fb.title; text.textContent=fb.text;
  } else {
    title.textContent="İstatistikler"; text.textContent="";
  }
  /* Alt metin bossa (galibiyet) satir hic yer kaplamasin */
  text.style.display = text.textContent ? "" : "none";
  const rg=document.getElementById("result-grid");
  if(done){ rg.innerHTML=buildResultGridHTML(); rg.style.display=""; }
  else { rg.innerHTML=""; rg.style.display="none"; }

  document.getElementById("general-stats").style.display = general ? "" : "none";
  document.getElementById("share-btn").style.display = (share && done) ? "" : "none";
  if(general) renderStats();

  document.getElementById("copied-toast").classList.add("hidden");
  /* Sayac yalniz bugunun bitmis bulmacasinda anlamli */
  const gs=document.getElementById("geri-sayim");
  if(gs){
    const goster = !!(done && g.isToday);
    gs.style.display = goster ? "" : "none";
    if(goster) geriSayimBaslat(); else geriSayimDurdur();
  }
  document.getElementById("overlay").classList.remove("hidden");
}

// oyun bitince/açılınca çıkan popup: günlük -> tam; arşiv -> yalnızca o günün sonucu
function openResult(){
  const daily = !!(current && current.isToday);
  showModal(current, daily, daily);
}
// İstatistik butonu: HER ZAMAN bugünün günlük istatistik ekranı (arşivden bağımsız)
function openStats(){
  showModal(stateForDate(TrPuzzleClock.calendar()), true, true);
}

function buildResultGridHTML(){
  const g=modalG;
  const no=puzzleNo(g.date)+1;
  const tries=g.win?g.guesses.length:"X";
  let h=`<div class="result-head">Harfle #${no} · ${tries}/6</div><div class="result-rows">`;
  g.guesses.forEach(gs=>{
    h+=`<div class="result-row">`;
    scoreGuess(gs,g.word).forEach(s=>{ h+=`<span class="res ${s}"></span>`; });
    h+=`</div>`;
  });
  return h+`</div>`;
}
function closeModal(){ document.getElementById("overlay").classList.add("hidden"); geriSayimDurdur(); }

/* ---------- sonraki bulmacaya geri sayim ---------- */
let geriSayimZ=null;
function geriSayimYaz(){
  const el=document.getElementById("geri-sayim-saat");
  if(!el) return;
  const n=new Date();
  const yarin=new Date(n.getTime()+TrPuzzleClock.remaining(n));
  let k=Math.max(0, Math.floor((yarin-n)/1000));
  const s=String(k%60).padStart(2,"0"); k=Math.floor(k/60);
  const d=String(k%60).padStart(2,"0"); const sa=String(Math.floor(k/60)).padStart(2,"0");
  el.textContent=sa+":"+d+":"+s;
}
function geriSayimBaslat(){
  geriSayimDurdur();
  geriSayimYaz();
  geriSayimZ=setInterval(geriSayimYaz, 1000);
}
function geriSayimDurdur(){ if(geriSayimZ){ clearInterval(geriSayimZ); geriSayimZ=null; } }

function buildShareText(){
  const g=modalG;
  const no=puzzleNo(g.date)+1;
  const tries=g.win?g.guesses.length:"X";
  let out=`Harfle #${no} ${tries}/6\n\n`;
  g.guesses.forEach(gs=>{
    scoreGuess(gs,g.word).forEach(s=>{
      out+= s==="correct"?"🟩":s==="present"?"🟨":"⬜";
    });
    out+="\n";
  });
  out+="\nhttps://trpuzzle.com/harfle/";
  return out.trim();
}

document.getElementById("share-btn").addEventListener("click", async ()=>{
  const text=buildShareText();
  try{
    if(navigator.share){ await navigator.share({text}); return; }
  }catch(e){}
  try{
    await navigator.clipboard.writeText(text);
    document.getElementById("copied-toast").classList.remove("hidden");
  }catch(e){
    const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta);
    ta.select(); try{document.execCommand("copy");}catch(_){}
    ta.remove();
    document.getElementById("copied-toast").classList.remove("hidden");
  }
});
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("stats-btn").addEventListener("click", openStats);

/* ---------- animasyon/mesaj ---------- */
let msgTimer=null;
function msg(text){
  const m=document.getElementById("message");
  m.innerHTML = text? `<span class="toast">${TrPuzzleSecurity.escape(text)}</span>`:"";
  if(text){ clearTimeout(msgTimer); msgTimer=setTimeout(()=>m.innerHTML="",1400); }
}
function shake(){
  const row=document.querySelector(`.row[data-r="${current.row}"]`);
  if(row){ row.classList.add("shake"); setTimeout(()=>row.classList.remove("shake"),400); }
}

/* ================= ARŞİV ================= */
function buildArchive(){
  const list=document.getElementById("archive-list"); list.innerHTML="";
  const today=startOfDay(TrPuzzleClock.calendar());
  for(let i=0;i<=dayDiff(today,ARCHIVE_START);i++){
    const d=new Date(today); d.setDate(d.getDate()-i);
    if(dateKey(d)<"2026-10-01") break;              // başlangıçtan önce yok
    const key=dateKey(d);
    const st=loadState(key);
    const isToday=i===0;
    /* Vurgu, o an acik olan gune ait; arsiv yeniden acilinca secim korunur. */
    const secili = !!(current && current.key===key);
    const item=document.createElement("div");
    item.className="archive-item"+(secili?" secili":"");
    let statusHTML = "";
    if(st && st.done){
      statusHTML = st.win
        ? `<span class="pegs win">${st.guesses.length}/6</span>`
        : `<span class="pegs lose">X/6</span>`;
    } else if(st && st.guesses && st.guesses.length>0){
      statusHTML = `<span class="pegs progress">Devam ediyor</span>`;
    }
    item.innerHTML=`
      <div>
        <div class="a-date">${formatTRShort(d)}${isToday?'<span class="badge-today">BUGÜN</span>':''}</div>
        <div class="a-num">Bulmaca #${puzzleNo(d)+1}</div>
      </div>
      <div class="a-status">${statusHTML}</div>`;
    item.addEventListener("click",()=>{ closeModal(); startGame(d); if(!current.done && store.get("howtoSeen")!==1){ document.getElementById("howto-dont-row").style.display=""; document.getElementById("howto").classList.remove("hidden"); } });
    list.appendChild(item);
  }
}

/* ---------- tema (aydınlık / karanlık) - ayarlardan ---------- */
const isLight = () => document.body.classList.contains("light");
function setTheme(light){
  document.body.classList.toggle("light", light);
  store.set("theme", light ? "light" : "dark");
  document.getElementById("theme-select").value = light ? "light" : "dark";
}
function temaBoyaSadece(light){
  document.body.classList.toggle("light", light);
  const s=document.getElementById("theme-select"); if(s) s.value = light ? "light" : "dark";
}
function kayitliTema(){ const t=store.get("theme"); return (t==="light"||t==="dark") ? t : null; }
/* Kayitli tercih varsa o, yoksa cihazin temasi (secim yapilmadan kaydedilmez) */
function applyTheme(){
  const t=kayitliTema();
  if(t) { setTheme(t==="light"); return; }
  temaBoyaSadece(!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches));
}
document.getElementById("theme-select").addEventListener("change", e=> setTheme(e.target.value==="light"));
/* Kullanici elle secmediyse cihaz temasi degisince site de uyar */
try{
  const _mq=window.matchMedia("(prefers-color-scheme: dark)");
  const _f=()=>{ if(!kayitliTema()) applyTheme(); };
  _mq.addEventListener ? _mq.addEventListener("change",_f) : _mq.addListener(_f);
}catch(e){}

/* ---------- renk körü modu ---------- */
function applyCb(){
  const on = store.get("cb")===1;
  document.body.classList.toggle("cb", on);
  document.getElementById("cb-toggle").setAttribute("aria-checked", on?"true":"false");
}
document.getElementById("cb-toggle").addEventListener("click", ()=>{
  store.set("cb", store.get("cb")===1 ? 0 : 1);
  applyCb();
});

/* ---------- yalnızca ekran klavyesi girişi ---------- */
const oskOnly = () => store.get("osk")===1;
function applyOsk(){
  document.getElementById("osk-toggle").setAttribute("aria-checked", oskOnly()?"true":"false");
}
document.getElementById("osk-toggle").addEventListener("click", ()=>{
  store.set("osk", oskOnly() ? 0 : 1);
  applyOsk();
});

/* ---------- zor mod ---------- */
const hardMode = () => store.get("hard")===1;
function applyHard(){
  document.getElementById("hard-toggle").setAttribute("aria-checked", hardMode()?"true":"false");
}
document.getElementById("hard-toggle").addEventListener("click", ()=>{
  store.set("hard", hardMode() ? 0 : 1);
  applyHard();
});
// açığa çıkan ipuçları sonraki tahminde kullanılmalı; ihlal varsa hata mesajı döndürür
function hardModeError(guess){
  const g=[...guess], ans=current.word;
  for(const [i,prev] of current.guesses.entries()){
    const res=current.scores[i], pg=[...prev];
    for(let i=0;i<COLS;i++){
      if(res[i]==="correct" && g[i]!==pg[i]) return `${i+1}. harf ${pg[i]} olmalı`;
    }
    for(let i=0;i<COLS;i++){
      if(res[i]==="present" && !g.includes(pg[i])) return `Tahmin ${pg[i]} harfini içermeli`;
    }
  }
  return null;
}

/* ---------- popup aç/kapat (ayarlar, nasıl oynanır) ---------- */
document.getElementById("settings-btn").addEventListener("click", ()=>{
  document.getElementById("settings").classList.remove("hidden");
});
document.addEventListener("click", e=>{
  const op=e.target.closest("[data-open]");
  if(op){
    const id=op.getAttribute("data-open");
    if(id==="howto") document.getElementById("howto-dont-row").style.display="none"; // elle açılınca "bir daha gösterme" yok
    document.getElementById(id).classList.remove("hidden");
    return;
  }
  const c=e.target.closest("[data-close]");
  if(c){ document.getElementById(c.getAttribute("data-close")).classList.add("hidden"); return; }
  if(e.target.id==="settings"){ document.getElementById("settings").classList.add("hidden"); }
  if(e.target.id==="howto"){ document.getElementById("howto").classList.add("hidden"); }
});

/* ---------- nasıl oynanır: Anladım + bir daha gösterme ---------- */
document.getElementById("howto-ok").addEventListener("click", ()=>{
  if(document.getElementById("howto-dont").checked) store.set("howtoSeen", 1);
  document.getElementById("howto").classList.add("hidden");
});

/* ---------- başlat ---------- */
applyTheme();
applyCb();
applyOsk();
applyHard();
startGame(TrPuzzleClock.calendar());
// ilk açılışta "Nasıl Oynanır?" popup'ı (daha önce "bir daha gösterme" seçilmediyse)
if(store.get("howtoSeen")!==1 && (location.hash||"")!=="#arsiv"){
  document.getElementById("howto-dont-row").style.display="";   // açılışta kutucuk görünür
  document.getElementById("howto").classList.remove("hidden");
}
