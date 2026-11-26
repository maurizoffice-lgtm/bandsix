<script>
/* ================= ENGINE ================= */
const APP = document.getElementById('app');
const BAR = document.getElementById('barInner');
const PBAR = document.getElementById('pbar');

function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)){
    if (v==null || v===false) continue;
    if (k==='class') el.className = v;
    else if (k==='svg') el.innerHTML = v; /* static icon markup written in this file only */
    else if (k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v===true ? '' : v);
  }
  for (const c of kids.flat(Infinity)){ if (c==null || c===false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
const byId = (type,id) => POOL[type].find(x => x.id===id);
const LETTERS = ['A','B','C','D','E'];
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 3200); }
const store = {
  get(k, d){ try{ const v=localStorage.getItem('toefl.'+k); return v==null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('toefl.'+k, JSON.stringify(v)); }catch(e){} }
};
const SETTINGS = Object.assign({audio:'auto', rate:1.15}, store.get('settings', {}));
if (!SETTINGS.rateV2){ if (SETTINGS.rate<1.15) SETTINGS.rate=1.15; SETTINGS.rateV2=true; store.set('settings', SETTINGS); }
function saveSettings(){ store.set('settings', SETTINGS); }

/* ---------- icons ---------- */
const IC = {
  read:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h6a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h7z"/></svg>',
  listen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  write:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
  stop:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
};
const SEC = {
  reading:{name:'Reading', de:'Lesen', ic:IC.read},
  listening:{name:'Listening', de:'Hören', ic:IC.listen},
  writing:{name:'Writing', de:'Schreiben', ic:IC.write},
  speaking:{name:'Speaking', de:'Sprechen', ic:IC.speak}
};

/* ---------- task type catalogue ---------- */
const TYPES = {
  cw:{sec:'reading', name:'Complete the Words', en:'Fill in the missing letters in the paragraph.',
      de:'Ein kurzer Absatz (70 bis 100 Wörter). Der erste Satz ist vollständig, danach fehlt bei jedem zweiten Wort die zweite Hälfte. Du ergänzt 10 Lücken.',
      tips:['Lies erst den ganzen Satz, dann füllen. Grammatik verrät oft die Endung (Plural -s, Verbform, Adjektiv vs. Adverb).','Die Zahl der Felder zeigt, wie viele Buchstaben fehlen.','Schreibfehler zählen als falsch. Achte auf Doppelbuchstaben.']},
  daily:{sec:'reading', name:'Read in Daily Life', en:'Read the text and answer the questions.',
      de:'Kurze Alltagstexte (15 bis 150 Wörter): Aushänge, E-Mails, Nachrichten, Pläne, Werbung. 2 bis 3 Fragen pro Text.',
      tips:['Erst die Frage lesen, dann gezielt scannen.','Achte auf Zahlen, Zeiten und Bedingungen (if, unless, only).','Die richtige Antwort ist fast immer eine Umschreibung, nicht wortgleich.']},
  acad:{sec:'reading', name:'Read an Academic Passage', en:'Read the passage and answer the questions.',
      de:'Ein akademischer Text von ca. 200 Wörtern mit 5 Fragen: Detail, Inferenz, Vokabel, Funktion („Why does the author mention…“), Hauptidee.',
      tips:['Vokabelfragen: Ersetze das Wort im Satz durch jede Option.','„Why does the author mention X?“ fragt nach der Funktion (Beispiel, Kontrast, Beleg).','Bei NOT- und Inferenzfragen jede Option am Text prüfen.']},
  lcr:{sec:'listening', name:'Listen and Choose a Response', en:'You will hear a person speak. Choose the best response.',
      de:'Du hörst einen Satz und wählst die natürlichste Antwort aus vier Optionen.',
      tips:['Erkenne die Funktion: Frage, Bitte, Vorschlag, Beschwerde.','Vorsicht bei Klangfallen: Optionen mit gleichen oder ähnlich klingenden Wörtern sind oft falsch.','„Why don’t we…?“ ist ein Vorschlag, keine Warum-Frage.']},
  lconv:{sec:'listening', name:'Listen to a Conversation', en:'Listen to a conversation. Then answer the questions.',
      de:'Kurzes Gespräch zwischen zwei Personen (Campus, Alltag). 2 Fragen: Problem, nächster Schritt, Details.',
      tips:['Achte auf das Problem und die Lösung.','„What will the woman probably do next?“ wird meist am Ende beantwortet.']},
  lann:{sec:'listening', name:'Listen to an Announcement', en:'Listen to an announcement. Then answer the questions.',
      de:'Durchsage von 40 bis 85 Wörtern (Uni, Campusradio, Exkursion). 2 Fragen zu Zweck und Details.',
      tips:['Der Zweck steht meist am Anfang.','Änderungen (instead, moved, no longer) werden fast immer abgefragt.']},
  ltalk:{sec:'listening', name:'Listen to an Academic Talk', en:'Listen to part of a lecture. Then answer the questions.',
      de:'Ausschnitt einer Vorlesung (100 bis 250 Wörter). 4 Fragen: Hauptthema, Details, Funktion, Haltung des Sprechers.',
      tips:['Notiere Struktur-Signale: first, second, the surprising part, the key point.','Haltungsfragen: Achte auf Wertungen wie „that’s an exaggeration“.']},
  bas:{sec:'writing', name:'Build a Sentence', en:'Move the words in the boxes to create a grammatical sentence.',
      de:'Antwort auf eine Aussage: Bringe Wortgruppen in die richtige Reihenfolge. Eine Gruppe passt eventuell nicht.',
      tips:['Finde zuerst Subjekt und Verb.','Indirekte Fragen haben Aussagesatz-Stellung: „whether I had read“, nicht „whether had I read“.','Prüfe Zeitform und Passiv (is being repaired).']},
  email:{sec:'writing', name:'Write an Email', en:'Write an email. You have 7 minutes.',
      de:'Situation lesen und eine E-Mail schreiben, die alle drei Punkte abdeckt. 7 Minuten, Bewertung 0 bis 5.',
      tips:['Struktur: Anrede, je ein kurzer Absatz pro Punkt, Gruß.','Passender Ton: höflich gegenüber Professor:innen, freundlich bei Mitstudierenden.','Ca. 120 bis 180 Wörter reichen. Lass 30 Sekunden zum Korrekturlesen.']},
  disc:{sec:'writing', name:'Academic Discussion', en:'Respond to the professor’s question. Write at least 100 words. You have 10 minutes.',
      de:'Forum: Eine Frage der Professorin und zwei Beiträge von Studierenden. Du schreibst einen eigenen Beitrag mit klarer Position.',
      tips:['Position im ersten Satz.','Bezieh dich auf einen Beitrag („Unlike Marcus, I believe…“) und bring einen neuen Grund.','Ein konkretes Beispiel macht den Unterschied zwischen 4 und 5.']},
  repeat:{sec:'speaking', name:'Listen and Repeat', en:'Listen to the speaker and repeat exactly what you hear.',
      de:'Sieben Sätze in einem Szenario, steigend in Länge. Du hörst jeden Satz einmal und sprichst ihn so genau wie möglich nach (8 bis 12 Sekunden).',
      tips:['Höre auf Sinneinheiten statt einzelne Wörter.','Kleine Wörter (the, a, to, of) nicht verschlucken. Sie zählen.','Lieber vollständig und ruhig als schnell.']},
  interview:{sec:'speaking', name:'Take an Interview', en:'Answer the interviewer’s questions. You have 45 seconds for each answer.',
      de:'Ein Interviewer stellt vier Fragen zu einem Thema (im echten Test als Video). Du hast je 45 Sekunden, keine Vorbereitungszeit.',
      tips:['Formel: Antwort, Grund, Beispiel, kurzer Abschluss.','Fang sofort an. Stille kostet mehr als ein einfacher Satz.','Nutze die vollen 45 Sekunden.']}
};
const TYPE_ORDER = ['cw','daily','acad','lcr','lconv','lann','ltalk','bas','email','disc','repeat','interview'];

/* ---------- capabilities ---------- */
let TTS=null, DICT=null, SAMPLE=null, TTS_OFF=false, AI_OFF=false, CAPS_READY=false;
const ttsSink = {line:null, state:null};
const dictSink = {partial:null, final:null, state:null};
(async function initCaps(){
  for (let i=0;i<30 && !(window.claude && window.claude.use);i++) await new Promise(r=>setTimeout(r,100));
  if (window.claude && window.claude.use){
    const get = n => window.claude.use(n).catch(()=>null);
    [TTS, DICT, SAMPLE, DB] = await Promise.all([get('tts'), get('dictation'), get('sample'), get('db')]);
    loadClaudeFocus();
  }
  CAPS_READY = true;
  if (TTS){
    TTS.onLine(e => ttsSink.line && ttsSink.line(e));
    TTS.onState(e => { if (e.reason==='not_granted'){ TTS_OFF=true; } ttsSink.state && ttsSink.state(e); });
  }
  if (DICT){
    DICT.onPartial(e => dictSink.partial && dictSink.partial(e.text));
    DICT.onFinal(e => dictSink.final && dictSink.final(e.text));
    DICT.onState(e => dictSink.state && dictSink.state(e));
  }
  if (VIEW==='home') renderHome();
})();
const hasBrowserTTS = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance!=='undefined';
function audioEngine(){
  if (TTS_OFF) return null;
  if (SETTINGS.audio==='browser' && hasBrowserTTS()) return 'browser';
  if (TTS) return 'claude';
  if (hasBrowserTTS()) return 'browser';
  return null;
}
const ACCENT_OF = {buttery:'en-US', airy:'en-GB', glassy:'en-AU', rounded:'en-US'};
function browserVoice(v){
  const all = (speechSynthesis.getVoices()||[]).filter(x=>/^en/i.test(x.lang));
  const want = ACCENT_OF[v]||'en-US';
  const exact = all.filter(x=>x.lang.replace('_','-')===want);
  if (exact.length) return exact[v==='rounded' && exact.length>1 ? 1 : 0];
  return all[0]||null;
}
/* play a list of {text, voice}; resolves when finished; rejects {code} */
function play(lines){
  const eng = audioEngine();
  if (!eng) return Promise.reject({code:'none'});
  if (eng==='claude'){
    return TTS.speak(lines.map((l,i)=>({text:l.text, voice:l.voice||'buttery', language:'en', id:'l'+i})), {rate:SETTINGS.rate, language:'en'})
      .catch(e => { if (e && e.code==='not_granted') TTS_OFF=true; throw e; });
  }
  return new Promise((res, rej) => {
    speechSynthesis.cancel();
    let i = 0; let stopped = false;
    play._cancel = () => { stopped = true; speechSynthesis.cancel(); rej({code:'stopped'}); };
    const next = () => {
      if (stopped) return;
      if (i>=lines.length){ ttsSink.state && ttsSink.state({state:'idle', reason:'completed'}); return res({}); }
      const l = lines[i]; const u = new SpeechSynthesisUtterance(l.text);
      const vo = browserVoice(l.voice); if (vo){ u.voice = vo; u.lang = vo.lang; } else u.lang='en-US';
      u.rate = SETTINGS.rate; const idx=i;
      u.onstart = () => { ttsSink.state && ttsSink.state({state:'speaking'}); ttsSink.line && ttsSink.line({line:idx}); };
      u.onend = () => { i++; next(); };
      u.onerror = (ev) => { if (!stopped) rej({code:'upstream_error'}); };
      speechSynthesis.speak(u);
    };
    next();
  });
}
function stopAudio(){
  try{ if (TTS && TTS.active()) TTS.stop(); }catch(e){}
  try{ if (play._cancel) { play._cancel(); play._cancel=null; } else if (hasBrowserTTS()) speechSynthesis.cancel(); }catch(e){}
}
if (hasBrowserTTS()) { try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = ()=>{}; }catch(e){} }

/* ---------- timers ---------- */
const CLOCK = {section:null, unit:null};   // {end, onExpire, soft, fired}
let localTimers = [];
function clearLocal(){ localTimers.forEach(t=>clearInterval(t)); localTimers=[]; }
function setUnitClock(sec, onExpire, soft){ CLOCK.unit = sec? {end:Date.now()+sec*1000, onExpire, soft, fired:false} : null; tick(); }
function fmt(s){ s=Math.max(0,Math.ceil(s)); const m=Math.floor(s/60); return m+':'+String(s%60).padStart(2,'0'); }
function tick(){
  const el = document.getElementById('clock'); const now = Date.now();
  for (const k of ['section','unit']){
    const c = CLOCK[k];
    if (c && !c.fired && now>=c.end){ c.fired=true; if (c.onExpire) setTimeout(c.onExpire,0); }
  }
  if (!el) return;
  const c = (CLOCK.unit && !CLOCK.unit.fired) ? CLOCK.unit : CLOCK.section;
  if (!c){ el.hidden=true; return; }
  el.hidden=false;
  const left=(c.end-now)/1000; el.textContent = fmt(left);
  el.classList.toggle('low', left<=30);
  el.title = c===CLOCK.unit ? 'Zeit für diese Aufgabe' : 'Zeit für diesen Abschnitt';
}
setInterval(tick, 250);

/* ---------- text helpers ---------- */
const NUMW = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = {20:'twenty',30:'thirty',40:'forty',50:'fifty',60:'sixty',70:'seventy',80:'eighty',90:'ninety'};
function numWord(n){ n=+n; if (n<20) return NUMW[n]; if (n<100){ const t=Math.floor(n/10)*10, r=n%10; return TENS[t]+(r?' '+NUMW[r]:''); } return String(n); }
function words(s){
  return s.toLowerCase().replace(/(\d+):(\d+)/g,(m,a,b)=>a+' '+(b==='00'?'':b)).replace(/\d+/g,m=>numWord(m))
    .replace(/[’]/g,"'").replace(/[^a-z' ]+/g,' ').replace(/'s\b/g,'s').split(/\s+/).filter(Boolean);
}
function lcsMatch(ref, hyp){
  const n=ref.length, m=hyp.length, d=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) d[i][j] = ref[i]===hyp[j] ? d[i+1][j+1]+1 : Math.max(d[i+1][j], d[i][j+1]);
  const hit = new Array(n).fill(false); let i=0,j=0;
  while(i<n&&j<m){ if(ref[i]===hyp[j]){hit[i]=true;i++;j++;} else if(d[i+1][j]>=d[i][j+1]) i++; else j++; }
  return {count:d[0][0], hit};
}
function repeatScore(ref, said){
  const r=words(ref), s=words(said||''); if(!s.length) return {score:0, acc:0, hit:new Array(r.length).fill(false)};
  const {count, hit} = lcsMatch(r, s); const extra = Math.max(0, s.length - count);
  const acc = Math.max(0, (count - extra*0.5)/r.length);
  const score = (acc>=0.999 && extra===0)?5 : acc>=0.9?4 : acc>=0.75?3 : acc>=0.45?2 : acc>0?1 : 0;
  return {score, acc, hit};
}
const wordCount = s => (s||'').trim().split(/\s+/).filter(Boolean).length;
function shuffleSeeded(arr, seedStr){
  let seed=0; for(const c of seedStr) seed=(seed*31+c.charCodeAt(0))>>>0;
  const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a;
}

/* ---------- complete-the-words builder ---------- */
const CWC = {};
function cwBuild(item){
  if (CWC[item.id]) return CWC[item.id];
  const m = item.text.match(/^.*?[.!?](\s|$)/);
  const first = m ? m[0] : '';
  const rest = item.text.slice(first.length);
  const parts = rest.match(/[A-Za-z]+|[^A-Za-z]+/g) || [];
  let wi=0, blanks=0; const toks=[];
  for (const p of parts){
    /* never blank capitalised words: names, places and sentence starts test knowledge, not English */
    if (/^[A-Za-z]+$/.test(p) && p.length>=2 && !/^[A-Z]/.test(p)){
      const isBlank = (wi%2===1) && blanks<10; wi++;
      if (isBlank){ const keep=Math.max(1,Math.floor(p.length/2)); toks.push({stem:p.slice(0,keep), miss:p.slice(keep), b:blanks++}); continue; }
    }
    toks.push({t:p});
  }
  return CWC[item.id] = {first, toks, n:blanks};
}

/* ================= RUN STATE ================= */
let VIEW='home', RUN=null, TOKEN=0;
const alive = t => t===TOKEN;
const SECTION_TIME = {reading:27*60};
const UNIT_TIME = {lcr:10, lconv:20, lann:20, ltalk:40, bas:30, email:420, disc:600};

function unitsFor(type, ids){ return ids.map(id => ({type, id})); }
/* ---------- keep mock tests and training apart ---------- */
const MOCK_STATIC = new Set(); for (const m of MOCKS) for (const k of ['reading','listening','writing','speaking']) for (const [t,ids] of Object.entries(m[k])) ids.forEach(id=>MOCK_STATIC.add(t+':'+id));
function mockSwap(){ return store.get('mockSwap', {}); }
function isMock(t,id){ if (MOCK_STATIC.has(t+':'+id)) return true; const sw=mockSwap(); return Object.values(sw).some(m=>Object.values(m).includes(id)); }
function trainPool(t){ return POOL[t].filter(x=>!isMock(t,x.id)); }
function mockIds(mock, key, t){ const sw=(mockSwap()[mock.id])||{}; return (mock[key][t]||[]).map(id=>{ const n=sw[t+':'+id]; return n && byId(t,n) ? n : id; }); }
function knownInMock(mock){ const done=store.get('done',{}); const out=[]; for (const k of ['reading','listening','writing','speaking']) for (const t of Object.keys(mock[k])) for (const id of mockIds(mock,k,t)) if (done[t+':'+id]) out.push({t,id,orig:(mock[k][t]||[])[mockIds(mock,k,t).indexOf(id)]}); return out; }
async function refreshMock(mock, onStep){
  const known = knownInMock(mock); const sw = mockSwap(); const m = sw[mock.id] ||= {};
  const done = store.get('done',{});
  const byType = {}; for (const x of known) (byType[x.t] ||= []).push(x);
  for (const [t, list] of Object.entries(byType)){
    onStep && onStep(TYPES[t].name);
    let newIds = [];
    if (GEN[t]){
      const chunks=[]; for (let i=0;i<list.length;i+=10) chunks.push(list.slice(i,i+10));
      for (const c of chunks) newIds.push(...await generate(t, '\n\nThese items will be used in a full mock test, so match the difficulty of the upper module exactly.', c.length));
    } else {
      newIds = trainPool(t).filter(x=>!done[t+':'+x.id]).map(x=>x.id);
    }
    list.forEach((x,i)=>{ if (newIds[i]) m[t+':'+x.orig] = newIds[i]; });
    store.set('mockSwap', sw);
  }
  pushProfile();
  return known.length;
}
function buildMock(mock, only){
  const secs=[];
  const add=(key, groups)=>{ const units=[]; for (const t of Object.keys(groups)) units.push(...unitsFor(t, mockIds(mock,key,t))); secs.push({key, units}); };
  for (const key of ['reading','listening','writing','speaking']) if (!only || only===key) add(key, mock[key]);
  return {mode:'exam', title: mock.name + (only? ' · '+SEC[only].name : ''), mockId:mock.id, secs, si:0, ui:0, resp:{}, started:Date.now(), id:'r'+Date.now()};
}
function buildTrain(type, ids){
  const list = ids ? ids : trainPool(type).map(x=>x.id);
  return {mode:'train', title:'Training · '+TYPES[type].name, trainType:type, secs:[{key:TYPES[type].sec, units:list.map(id=>({type, id}))}], si:0, ui:0, resp:{}, started:Date.now(), id:'t'+Date.now()};
}
const ukey = (si,ui) => si+'-'+ui;
const curUnit = () => RUN.secs[RUN.si].units[RUN.ui];
const curResp = () => (RUN.resp[ukey(RUN.si,RUN.ui)] ||= {});
function totalUnits(){ return RUN.secs.reduce((a,s)=>a+s.units.length,0); }
function doneUnits(){ let n=0; for(let i=0;i<RUN.si;i++) n+=RUN.secs[i].units.length; return n+RUN.ui; }

function startRun(run){
  RUN=run; VIEW='run'; stopAudio(); clearLocal(); CLOCK.section=null; CLOCK.unit=null;
  startSection(); renderUnit(); window.scrollTo(0,0);
}
function sectionClock(sec){
  const s = RUN.secs[RUN.si];
  return {end:Date.now()+sec*1000, onExpire:()=>{ toast('Zeit für '+SEC[s.key].name+' abgelaufen'); nextSection(); }, fired:false};
}
function startSection(){
  const s = RUN.secs[RUN.si];
  CLOCK.section = (RUN.mode==='exam' && SECTION_TIME[s.key]) ? sectionClock(SECTION_TIME[s.key]) : null;
  if (RUN.mode==='exam') RUN.showIntro = true;
}
/* ---------- progress saving ---------- */
function saveRun(){
  if (VIEW!=='run' || !RUN) return;
  const snap = Object.assign({}, RUN, {secLeft: CLOCK.section && !CLOCK.section.fired ? Math.max(0,(CLOCK.section.end-Date.now())/1000) : null, savedAt: Date.now()});
  store.set('run', snap);
}
setInterval(saveRun, 3000);
document.addEventListener('visibilitychange', ()=>{ if (document.hidden){ if (VIEW==='run' && RUN) recordStats(true); saveRun(); } });
function resumeRun(){
  const r = store.get('run', null); if (!r) return;
  stopAudio(); clearLocal(); CLOCK.unit=null;
  RUN = r; VIEW='run';
  CLOCK.section = r.secLeft!=null ? sectionClock(r.secLeft) : null;
  const res = RUN.resp[ukey(RUN.si,RUN.ui)];
  if (res && res.played && !res.audioDone) res.audioDone = true;
  renderUnit(); window.scrollTo(0,0);
}
function nextSection(){
  stopAudio(); clearLocal(); stopDict(); CLOCK.unit=null;
  if (RUN.si < RUN.secs.length-1){ RUN.si++; RUN.ui=0; startSection(); renderUnit(); }
  else finishRun();
}
function nextUnit(){
  stopAudio(); clearLocal(); stopDict(); CLOCK.unit=null; setTimeout(saveRun,0);
  const s = RUN.secs[RUN.si];
  if (RUN.ui < s.units.length-1){ RUN.ui++; renderUnit(); }
  else nextSection();
  window.scrollTo(0,0);
}
function finishRun(){
  TOKEN++;
  CLOCK.section=null; CLOCK.unit=null; stopAudio(); clearLocal(); stopDict();
  RUN.finished = Date.now(); store.set('run', null); recordStats(true); VIEW='results'; renderResults(); window.scrollTo(0,0);
}
function stopDict(){ try{ if (DICT && DICT.active()) DICT.stop().catch(()=>{}); }catch(e){} dictSink.partial=dictSink.final=dictSink.state=null; }

/* ================= TOP BAR ================= */
function renderBar(){
  BAR.replaceChildren();
  BAR.append(h('button',{class:'brand', onclick:()=>goHome(true), 'aria-label':'Zur Startseite'}, h('span',{class:'mk'},'T'), 'TOEFL Trainer'));
  if (VIEW==='run' && RUN){
    const s = RUN.secs[RUN.si];
    BAR.append(h('span',{class:'secchip sec-'+s.key}, SEC[s.key].name));
    BAR.append(h('span',{class:'progress'}, RUN.mode==='train' ? `Aufgabe ${RUN.ui+1} von ${s.units.length}` : `${SEC[s.key].de} · Teil ${RUN.ui+1} von ${s.units.length}`));
    BAR.append(h('span',{class:'spacer'}));
    BAR.append(h('span',{class:'clock', id:'clock', hidden:true}));
    const exit = h('button',{class:'btn small ghost', onclick:()=>{
      exit.replaceWith(h('span',{class:'row small'}, 'Beenden und auswerten?',
        h('button',{class:'btn small', onclick:()=>finishRun()},'Ja'),
        h('button',{class:'btn small ghost', onclick:()=>renderBar()},'Nein')));
    }}, 'Beenden');
    BAR.append(h('button',{class:'btn small', onclick:()=>{ saveRun(); goHome(true); toast(RUN_SAVED_MSG); }, title:'Zurück zum Hauptmenü, dein Stand bleibt gespeichert'}, '← Hauptmenü'));
    BAR.append(exit);
    PBAR.hidden=false; PBAR.firstElementChild.style.width = (100*doneUnits()/totalUnits())+'%';
  } else {
    BAR.append(h('span',{class:'spacer'}));
    if (VIEW!=='home') BAR.append(h('button',{class:'btn small ghost', onclick:()=>goHome(true)},'Startseite'));
    PBAR.hidden=true;
  }
  tick();
}
function goHome(force){
  if (VIEW==='run' && !force) return;
  if (VIEW==='run'){ if (RUN) recordStats(true); saveRun(); }
  TOKEN++;
  stopAudio(); clearLocal(); stopDict(); CLOCK.section=null; CLOCK.unit=null; VIEW='home'; RUN=null; renderHome(); window.scrollTo(0,0);
}

/* ================= HOME ================= */
const TEST_DAY = new Date(2026,10,30,13,0,0);
function renderHome(){
  VIEW='home'; renderBar(); APP.replaceChildren();
  const ms = TEST_DAY - Date.now(); const days = Math.floor(ms/864e5), hrs = Math.floor((ms%864e5)/36e5);
  const cd = h('div',{class:'countdown'},
    h('div',null, h('div',{class:'eyebrow', style:'color:inherit;opacity:.85'},'Dein Testtermin'), h('div',{style:'font-weight:600;margin-top:4px'},'Mo, 30. November 2026 · 13:00')),
    ms>0 ? h('div',{class:'big'}, days+' T ', h('span',{style:'font-size:24px'}, hrs+' Std')) : h('div',{class:'big'},'Testtag'),
    h('div',{class:'lines'}, 'Identität bis spätestens 27.11. bestätigen. Davor ein kompletter Probetest unter Zeitdruck, danach gezielt die schwächsten Aufgabentypen.'));
  APP.append(h('section',{class:'hero'},
    h('div',{class:'stack', style:'justify-content:center'},
      h('div',{class:'eyebrow'},'Übungsumgebung · Format ab 2026'),
      h('h1',null,'Alle elf Aufgabentypen in voller Testlänge'),
      h('p',{class:'muted', style:'max-width:60ch'},'Aufbau, Fragenzahl, Textlängen und Zeiten folgen der offiziellen ETS-Testspezifikation 2026, Writing und Speaking werden nach den offiziellen ETS-Bewertungsrastern bewertet. Die Aufgaben sind auf dem Niveau des schwereren zweiten Testblocks (C1 bis C2) geschrieben und die Band-Umrechnung ist bewusst streng. Wenn du hier 5,5 schaffst, bist du gut vorbereitet.')),
    cd));

  // resume
  const saved = store.get('run', null);
  if (saved && saved.secs){
    const s0 = saved.secs[saved.si];
    APP.append(h('div',{class:'panel row', style:'margin-top:24px;justify-content:space-between;border-color:var(--accent)'},
      h('div',null, h('b',null,'Unterbrochen: '+saved.title), h('div',{class:'small muted'}, SEC[s0.key].name+', Teil '+(saved.ui+1)+' von '+s0.units.length+(saved.secLeft!=null? ' · Restzeit '+fmt(saved.secLeft):''))),
      h('div',{class:'row'}, h('button',{class:'btn primary', onclick:()=>resumeRun()},'Fortsetzen'), h('button',{class:'btn ghost', onclick:()=>{ store.set('run',null); renderHome(); }},'Verwerfen'))));
  }
  // mocks
  APP.append(h('h2',{style:'margin:34px 0 12px'},'Probetests'));
  const mg = h('div',{class:'grid2'});
  for (const m of MOCKS){
    const n = k => Object.values(m[k]).flat().length;
    mg.append(h('div',{class:'card'},
      h('div',{class:'row', style:'justify-content:space-between'}, h('h3',null,m.name), h('span',{class:'pill'},'ca. 85 Min')),
      h('p',{class:'meta'}, `Reading 50 Fragen · Listening 47 Fragen · Writing 12 · Speaking 11, wie im echten Test. Timer nach ETS-Vorgaben, Audio nur einmal, Auswertung am Ende. Diese Aufgaben kommen im Training nicht vor.`),
      (()=>{ const kn = knownInMock(m); if (!kn.length) return h('p',{class:'small', style:'color:var(--good)'}, 'Alle Aufgaben sind für dich neu.');
        const box = h('div',{class:'directions stack-s', style:'border-color:var(--warn)'}, h('span',null, `${kn.length} Aufgaben aus diesem Test kennst du schon aus früheren Übungen.`));
        if (SAMPLE && !AI_OFF){ const b = h('button',{class:'btn small', onclick:async()=>{ b.disabled=true;
            try{ const n = await refreshMock(m, name=>{ b.textContent='Ersetze '+name+' …'; }); toast(n+' bekannte Aufgaben ersetzt'); renderHome(); }
            catch(e){ b.disabled=false; b.textContent='Bekannte durch neue ersetzen (KI)'; toast('Ersetzen hat nicht ganz geklappt. Bereits ersetzte Aufgaben bleiben, klick nochmal für den Rest.'); renderHome(); } }}, 'Bekannte durch neue ersetzen (KI)');
          box.append(h('div',null,b)); }
        return box; })(),
      h('div',{class:'row'},
        h('button',{class:'btn primary', onclick:()=>startRun(buildMock(m))},'Kompletten Test starten'),
        ...['reading','listening','writing','speaking'].map(k=>h('button',{class:'btn small', onclick:()=>startRun(buildMock(m,k))}, SEC[k].name)))));
  }
  APP.append(mg);

  // progress & weaknesses
  APP.append(h('h2',{style:'margin:34px 0 12px'},'Fortschritt und Schwächen'));
  APP.append(progressPanel());


  // training
  APP.append(h('h2',{style:'margin:34px 0 4px'},'Training nach Aufgabentyp'));
  APP.append(h('p',{class:'muted', style:'margin-bottom:14px'},'Ohne Zeitdruck. Nach jeder Aufgabe siehst du die Lösung mit Erklärung, beim Hören auch das Transkript.'));
  for (const sk of ['reading','listening','writing','speaking']){
    APP.append(h('div',{class:'row', style:'margin:18px 0 8px'}, h('span',{class:'secchip sec-'+sk}, SEC[sk].name)));
    const tl = h('div',{class:'typelist'});
    for (const t of TYPE_ORDER.filter(t=>TYPES[t].sec===sk)){
      const T = TYPES[t]; const cnt = trainPool(t).length;
      const canGen = GEN[t] && SAMPLE && !AI_OFF;
      const genBtn = canGen ? h('button',{class:'btn small ghost', title:'Neue Aufgaben auf hohem Niveau von der KI schreiben lassen', onclick:async()=>{
        genBtn.disabled=true; genBtn.textContent='Erzeuge …';
        try{ const ids = await generate(t); toast(ids.length+' neue Aufgaben erstellt'); startRun(buildTrain(t, ids)); }
        catch(e){ genBtn.disabled=false; genBtn.textContent='+ Neue (KI)'; toast(e && e.code==='rate_limited' ? 'Gerade zu viele Anfragen, bitte gleich nochmal.' : e && e.code==='not_granted' ? 'KI ist für diese Seite ausgeschaltet.' : 'Erzeugen hat nicht geklappt, bitte nochmal versuchen.'); if (e && e.code==='not_granted'){ AI_OFF=true; } }
      }}, '+ Neue (KI)') : null;
      const st = (store.get('stats',{})[t]);
      const dn = store.get('done',{}); const nDone = trainPool(t).filter(x=>dn[t+':'+x.id]).length;
      tl.append(h('div',{class:'card type'},
        h('div',{class:'ico sec-'+sk, svg:SEC[sk].ic}),
        h('div',{style:'min-width:0'}, h('h4',null, h('a',{href:'#', style:'color:inherit', onclick:(e)=>{ e.preventDefault(); renderType(t); }}, T.name)), h('p',{class:'meta'}, T.de), h('p',{class:'small muted', style:'margin-top:4px'}, nDone+' von '+cnt+' bearbeitet'), st && st.t ? h('p',{class:'small', style:'margin-top:4px'}, h('span',{class:'pill '+(st.c/st.t>=.85?'good':st.c/st.t>=.7?'warn':'bad')}, Math.round(st.c/st.t*100)+' % richtig'), h('span',{class:'muted'},' bei '+st.t+' Fragen bisher')) : null),
        h('div',{class:'stack-s', style:'align-items:flex-end'},
          h('button',{class:'btn small primary', onclick:()=>renderType(t), 'aria-label':T.name+' öffnen'}, 'Übersicht'),
          h('button',{class:'btn small', onclick:()=>startRun(buildTrain(t)), 'aria-label':T.name+' üben'}, 'Üben'),
          genBtn)));
    }
    APP.append(tl);
  }

  // mistakes
  const doneM = store.get('done',{});
  const mist = store.get('mistakes', []).filter(k=>{ const [t,id]=k.split(':'); return POOL[t] && byId(t,id) && (!isMock(t,id) || (doneM[k]||{}).mode==='exam'); });
  APP.append(h('h2',{style:'margin:38px 0 12px'},'Fehlerheft'));
  APP.append(h('div',{class:'panel row', style:'justify-content:space-between'},
    h('p',{style:'max-width:60ch'}, mist.length ? `${mist.length} Aufgaben zum Wiederholen: kurze Aufgaben mit einem Fehler, lange (z. B. Complete the Words, akademische Texte) unter 80 % richtig. Sie verschwinden, sobald du sie besser löst.` : 'Noch leer. Aufgaben mit Fehlern aus Probetests und Training landen automatisch hier.'),
    mist.length ? h('button',{class:'btn primary', onclick:()=>startRun(buildMistakeRun())},'Fehler wiederholen') : null));
  if (SAMPLE && !AI_OFF) APP.append(h('p',{class:'small muted', style:'margin-top:8px'},'„+ Neue (KI)“ bei den Aufgabentypen schreibt frische Aufgaben auf dem schweren Niveau. Sie werden in deinem Browser gespeichert und tauchen danach auch im normalen Training auf. KI-Aufgaben sind nicht von mir geprüft, bei einer unklaren Lösung im Zweifel die Erklärung lesen.'));

  // format explainer
  APP.append(h('h2',{style:'margin:38px 0 12px'},'Format und Scoring'));
  APP.append(formatPanel());

  // settings
  APP.append(h('h2',{style:'margin:38px 0 12px'},'Audio und Funktionen'));
  APP.append(settingsPanel());

  // history
  const hist = store.get('history', []);
  if (hist.length){
    APP.append(h('h2',{style:'margin:38px 0 12px'},'Verlauf'));
    APP.append(h('div',{class:'panel tbl-wrap'}, h('table',null,
      h('thead',null,h('tr',null,['Datum','Test','R','L','W','S','Gesamt','≈ 0–120'].map(x=>h('th',null,x)))),
      h('tbody',null, hist.slice().reverse().map(r=>h('tr',null,
        h('td',null,new Date(r.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+new Date(r.date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})),
        h('td',null,r.title), ['reading','listening','writing','speaking'].map(k=>h('td',null, r.b[k]!=null? r.b[k].toFixed(1):'–')),
        h('td',null,h('b',null, r.overall!=null? r.overall.toFixed(1):'–')), h('td',null, r.overall!=null? CONC[r.overall]:'–')))))));
  }
  APP.append(h('p',{class:'small muted', style:'margin-top:34px'},'Format, Fragenzahlen, Zeiten und Bewertungsraster nach der offiziellen ETS-Spezifikation 2026. Die Aufgaben selbst sind eigene Übungsinhalte, keine ETS-Fragen. Die Bänder sind Schätzungen, ETS veröffentlicht keine Umrechnungstabelle. Offizielle Übungstests gibt es bei ETS (TOEFL TestReady).'));
}

const CONC = {6:'114–120',5.5:'107–113',5:'95–106',4.5:'86–94',4:'72–85',3.5:'58–71',3:'44–57',2.5:'34–43',2:'24–33',1.5:'12–23',1:'0–11'};
const CEFR = b => b>=6?'C2': b>=5?'C1': b>=4?'B2': b>=3?'B1': b>=2?'A2':'A1';

function formatPanel(){
  const rows = [
    ['Reading','50 Fragen · ca. 27–30 Min','Complete the Words (30) · Read in Daily Life (5–15) · Read an Academic Passage (5–15)','adaptiv: Startblock, dann leichter oder schwerer Block'],
    ['Listening','47 Fragen · ca. 18–29 Min','Choose a Response (15–19) · Conversation (10) · Announcement (6–10) · Academic Talk (8–16)','adaptiv, Akzente US/UK/AUS'],
    ['Writing','12 Aufgaben · 23 Min','Build a Sentence (10) · Write an Email (7 Min) · Academic Discussion (10 Min)','E-Mail und Diskussion je 0–5'],
    ['Speaking','11 Aufgaben · 8 Min','Listen and Repeat (7) · Take an Interview (4 × 45 s)','jede Antwort 0–5, Interviewer im Video']
  ];
  const tabs = ['Abschnitte','Bänder & CEFR','Strategie'];
  let cur = 0;
  const body = h('div');
  const tabEls = tabs.map((t,i)=>h('button',{class:'tab', role:'tab', 'aria-selected':String(i===0), onclick:()=>{cur=i; tabEls.forEach((e,j)=>e.setAttribute('aria-selected',String(j===i))); draw();}}, t));
  function draw(){
    body.replaceChildren();
    if (cur===0){
      body.append(h('div',{class:'tbl-wrap'}, h('table',null, h('thead',null,h('tr',null,['Teil','Dauer','Aufgabentypen','Hinweis'].map(x=>h('th',null,x)))),
        h('tbody',null, rows.map(r=>h('tr',null, h('td',null,h('b',null,r[0])), h('td',null,r[1]), h('td',null,r[2]), h('td',{class:'muted'},r[3])))))));
      body.append(h('p',{class:'small muted', style:'margin-top:12px'},'Laut ETS-Spezifikation dauert der Test 1:23 bis 1:29 Stunden bei 120 Fragen. Reading und Listening passen sich an: Wer im ersten Block gut ist, bekommt einen schwereren zweiten Block. Die Probetests hier haben die gleiche Fragenzahl, aber alle Aufgaben liegen auf dem Niveau des schweren Blocks.'));
    } else if (cur===1){
      body.append(h('p',{style:'margin-bottom:12px'},'Jeder Abschnitt bekommt ein Band von 1 bis 6 in halben Schritten. Das Gesamtband ist der Durchschnitt der vier Abschnitte, auf 0,5 gerundet. In der Übergangsphase meldet ETS zusätzlich einen Vergleichswert auf der alten 0–120-Skala. Wie viele richtige Antworten welches Band ergeben, veröffentlicht ETS nicht. Die Umrechnung hier ist eine bewusst strenge Schätzung (z. B. Band 5 erst ab 85 % richtig).'));
      body.append(h('div',{class:'tbl-wrap'}, h('table',null, h('thead',null,h('tr',null,['Band','CEFR','≈ 0–120 gesamt'].map(x=>h('th',null,x)))),
        h('tbody',null, [6,5.5,5,4.5,4,3.5,3,2.5,2,1.5,1].map(b=>h('tr',null, h('td',null,h('b',null,b.toFixed(1))), h('td',null,CEFR(b)), h('td',null,CONC[b])))))));
      body.append(h('p',{class:'small muted', style:'margin-top:12px'},'Viele Master-Programme verlangen bisher 100 oder mehr (0–120). Das entspricht etwa Band 5 bis 5,5 gesamt. Prüfe die Mindestwerte pro Abschnitt in deiner Übersicht.'));
    } else {
      const tips = [
        ['Reading','Complete the Words zuerst schnell, dort holst du die meisten Punkte pro Minute. Bei langen Texten nicht festbeißen.'],
        ['Listening','Kein Zurückspulen. Notiere zwei, drei Stichworte und achte auf Signalwörter (but, actually, instead).'],
        ['Writing','Für Build a Sentence: Subjekt + Verb zuerst. E-Mail: drei Punkte abhaken. Diskussion: Position, Bezug auf einen Beitrag, neues Argument mit Beispiel.'],
        ['Speaking','Bei Listen and Repeat zählt Vollständigkeit. Im Interview sofort starten und 40 bis 45 Sekunden nutzen.']
      ];
      body.append(h('div',{class:'stack-s'}, tips.map(t=>h('div',null,h('b',null,t[0]+'. '),t[1]))));
    }
  }
  draw();
  return h('div',{class:'panel'}, h('div',{class:'tabs', role:'tablist'}, tabEls), body);
}

function settingsPanel(){
  const st = (ok, label, note) => h('div',{class:'row'}, h('span',{class:'pill '+(ok?'good':'warn')}, ok?'aktiv':'nicht verfügbar'), h('b',null,label), h('span',{class:'muted small'},note));
  const eng = audioEngine();
  const sel = h('select',{id:'audioSel', onchange:e=>{SETTINGS.audio=e.target.value; saveSettings(); renderHome();}},
    h('option',{value:'auto'},'Automatisch (Claude-Stimmen, sonst Browser)'),
    h('option',{value:'browser'},'Browser-Stimmen (US/UK/AUS, falls installiert)'));
  sel.value = SETTINGS.audio;
  const rate = h('select',{id:'rateSel', onchange:e=>{SETTINGS.rate=+e.target.value; saveSettings();}},
    [['0.9','langsamer'],['1','normal'],['1.15','schnell (Standard)'],['1.3','sehr schnell, wie unter Muttersprachlern']].map(([v,l])=>h('option',{value:v},l)));
  rate.value = String(SETTINGS.rate);
  const testBtn = h('button',{class:'btn small', onclick:()=>{ play([{text:'This is a sound check for your listening practice.', voice:'buttery'},{text:'And this is a second voice.', voice:'airy'}]).catch(e=>toast(e.code==='none'?'Keine Sprachausgabe in dieser Ansicht. Die Transkripte bleiben verfügbar.':'Audio nicht möglich ('+e.code+')')); }}, h('span',{svg:IC.play}), 'Audio testen');
  return h('div',{class:'panel stack'},
    h('div',{class:'stack-s'},
      st(!!eng, 'Sprachausgabe', eng==='claude'?'Claude-Stimmen (vier Stimmen)': eng==='browser'?'Browser-Stimmen':'Transkripte werden stattdessen angezeigt'),
      st(!!DICT, 'Spracheingabe für Speaking', DICT?'Dein Mikrofon wird mitgeschrieben und automatisch ausgewertet':'Ohne Mikrofon: laut sprechen und optional tippen'),
      st(!!SAMPLE && !AI_OFF, 'KI-Bewertung', SAMPLE?'Writing und Interview mit Feedback auf der 0–5-Skala':'Selbsteinschätzung nach Raster')),
    h('div',{class:'settings'}, h('label',{for:'audioSel'},'Audioquelle'), sel, h('label',{for:'rateSel'},'Tempo'), rate, testBtn),
    CAPS_READY ? null : h('p',{class:'small muted'},'Funktionen werden geladen …'),
    h('p',{class:'small muted'},'Im echten Test siehst du bei Speaking einen Interviewer im Video und hörst verschiedene Akzente. Hier ersetzen animierte Sprecherkarten das Video, die Stimmen kommen aus der Sprachausgabe.'));
}

/* ================= TYPE OVERVIEW ================= */
function itemLabel(t, it){
  const cut = (x,n=90)=>{ x=String(x||''); return x.length>n? x.slice(0,n-1)+'…' : x; };
  switch(t){
    case 'cw': return it.title; case 'daily': return it.kind+': '+it.title; case 'acad': return it.title;
    case 'lcr': return '„'+cut(it.s)+'“'; case 'lconv': return it.setting; case 'lann': return it.setting; case 'ltalk': return it.title+' ('+it.setting+')';
    case 'bas': return '„'+cut(it.ctx)+'“'; case 'email': return cut(it.situation); case 'disc': return it.course+': '+cut(it.prof.text,70);
    case 'repeat': return it.scene; case 'interview': return it.topic;
  }
  return it.id;
}
function inMock(t,id){ return MOCKS.filter(m=>Object.values(m).some(sec=>sec && typeof sec==='object' && sec[t] && sec[t].includes(id))).map(m=>m.id); }
function renderType(t){
  VIEW='type'; renderBar(); APP.replaceChildren(); window.scrollTo(0,0);
  const T = TYPES[t]; const done = store.get('done', {}); const mist = new Set(store.get('mistakes', []));
  const items = trainPool(t);
  const status = it => { const d = done[t+':'+it.id]; if (!d) return {k:'new'}; return Object.assign({k: mist.has(t+':'+it.id)?'wrong':'ok'}, d); };
  const open = items.filter(it=>status(it).k==='new');
  const wrap = h('div',{class:'stack'});
  wrap.append(h('div',null, h('button',{class:'btn small ghost', onclick:()=>goHome(true)}, '← Hauptmenü')));
  wrap.append(h('div',{class:'stack-s'}, h('span',{class:'secchip sec-'+T.sec, style:'align-self:flex-start'}, SEC[T.sec].name), h('h1',null,T.name), h('p',{class:'muted', style:'max-width:65ch'}, T.de)));
  const st = store.get('stats',{})[t];
  wrap.append(h('div',{class:'row'},
    h('span',{class:'pill'}, items.length+' Aufgaben'), h('span',{class:'pill good'}, (items.length-open.length)+' bearbeitet'), h('span',{class:'pill warn'}, open.length+' offen'),
    st && st.t ? h('span',{class:'pill'}, Math.round(st.c/st.t*100)+' % richtig insgesamt') : null));
  const genBtn = (GEN[t] && SAMPLE && !AI_OFF) ? h('button',{class:'btn', onclick:async()=>{
      genBtn.disabled=true; genBtn.textContent='Erzeuge …';
      try{ const ids = await generate(t); toast(ids.length+' neue Aufgaben erstellt'); renderType(t); }
      catch(e){ genBtn.disabled=false; genBtn.textContent='+ Neue Aufgaben erstellen (KI)'; toast(e && e.code==='rate_limited' ? 'Gerade zu viele Anfragen, bitte gleich nochmal.' : 'Erzeugen hat nicht geklappt, bitte nochmal versuchen.'); }
    }}, '+ Neue Aufgaben erstellen (KI)') : null;
  wrap.append(h('div',{class:'row'},
    open.length ? h('button',{class:'btn primary', onclick:()=>startRun(buildTrain(t, open.map(x=>x.id)))}, 'Alle offenen üben ('+open.length+')') : null,
    h('button',{class:'btn', onclick:()=>startRun(buildTrain(t))}, 'Alle üben'),
    genBtn));
  if (!GEN[t]) wrap.append(h('p',{class:'small muted'},'Für diesen Aufgabentyp gibt es keine KI-Erzeugung, weil die Bewertung ohnehin über die KI läuft. Du kannst jede Aufgabe beliebig oft wiederholen.'));
  const list = h('div',{class:'panel tbl-wrap'}, h('table',null,
    h('thead',null,h('tr',null, h('th',null,'Aufgabe'), h('th',null,'Status'), h('th',null,''))),
    h('tbody',null, items.map(it=>{
      const sx = status(it);
      const ratio = sx.n ? sx.c/sx.n : sx.score!=null ? sx.score/5 : null;
      const pill = sx.k==='new' ? h('span',{class:'pill'},'offen')
        : h('span',{class:'pill '+(ratio==null?'good': ratio>=.85?'good': ratio>=.6?'warn':'bad')}, 'bearbeitet'+(sx.n? ` · ${sx.c}/${sx.n} richtig` : sx.score!=null ? ` · ${sx.score}/5` : ''));
      return h('tr',null,
        h('td',{style:'min-width:0'}, itemLabel(t,it), it.gen? h('span',{class:'pill', style:'margin-left:6px'},'KI') : null),
        h('td',null, pill, (sx.d || sx.k==='wrong')? h('div',{class:'small muted'}, [sx.d? new Date(sx.d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}) : '', sx.k==='wrong' ? 'zum Wiederholen vorgemerkt' : ''].filter(Boolean).join(' · ')) : null),
        h('td',{style:'text-align:right'}, h('button',{class:'btn small', onclick:()=>startRun(buildTrain(t,[it.id]))}, sx.k==='new'?'Starten':'Wiederholen')));
    }))));
  wrap.append(list);
  wrap.append(h('p',{class:'small muted'},'Die Aufgaben der Probetests sind hier bewusst ausgeblendet, damit du sie im Test noch nicht kennst. Brauchst du mehr Übungsmaterial, erstell neue Aufgaben mit der KI.'));
  APP.append(wrap);
}

/* ================= RUNNER ================= */
function renderUnit(){
  TOKEN++;
  renderBar(); APP.replaceChildren(); clearLocal(); CLOCK.unit=null;
  const s = RUN.secs[RUN.si];
  if (RUN.mode==='exam' && RUN.showIntro){ return renderSectionIntro(s); }
  const u = curUnit(); const T = TYPES[u.type]; const r = curResp(); const item = byId(u.type, u.id);
  (RUN.seen ||= {})[ukey(RUN.si,RUN.ui)] = 1;
  const wrap = h('div',{class:'stack'});
  wrap.append(h('div',{class:'row', style:'justify-content:space-between'},
    h('div',null, h('div',{class:'eyebrow'}, T.name), h('div',{class:'muted small'}, T.en))));
  if (RUN.mode==='train' && RUN.ui===0) wrap.append(h('div',{class:'directions'}, h('b',null,'So funktioniert es. '), T.de, h('ul',{style:'margin:8px 0 0;padding-left:18px'}, T.tips.map(t=>h('li',null,t)))));
  const ctx = {mode:RUN.mode, reveal: !!r.revealed, item, resp:r, unit:u, next:()=>nextUnit(), setNextEnabled:(on)=>{ nextBtn.disabled=!on; }};
  const view = RENDER[u.type](ctx);
  wrap.append(view);
  // footer
  const foot = h('div',{class:'foot'});
  const isLast = RUN.si===RUN.secs.length-1 && RUN.ui===s.units.length-1;
  const nextBtn = h('button',{class:'btn primary', id:'nextBtn', onclick:()=>nextUnit()}, isLast ? 'Abschließen und auswerten' : 'Weiter');
  const objective = !['email','disc','repeat','interview'].includes(u.type);
  if (RUN.mode==='train' && objective && !r.revealed){
    foot.append(h('span',{class:'muted small'}, 'Erst prüfen, dann weiter.'));
    foot.append(h('div',{class:'row'}, h('button',{class:'btn ghost', onclick:()=>nextUnit()},'Überspringen'), h('button',{class:'btn primary', onclick:()=>{ stopAudio(); r.revealed=true; recordStats(false); renderUnit(); }},'Antwort prüfen')));
  } else {
    foot.append(h('span',{class:'muted small'}, RUN.mode==='exam' ? 'Im Test gibt es kein Zurück.' : ''));
    foot.append(nextBtn);
  }
  wrap.append(foot);
  APP.append(wrap);
  if (ctx.afterMount) ctx.afterMount();
  if (RUN.mode==='exam' && UNIT_TIME[u.type] && !ctx.ownClock) setUnitClock(UNIT_TIME[u.type], ()=>{ toast('Zeit abgelaufen'); nextUnit(); });
  if (RUN.mode==='train' && (u.type==='email'||u.type==='disc')) setUnitClock(UNIT_TIME[u.type], ()=>toast('Die Testzeit wäre jetzt abgelaufen. Du kannst in Ruhe fertig schreiben.'), true);
}
function renderSectionIntro(s){
  const T = s.units.reduce((m,u)=>{ m[u.type]=(m[u.type]||0)+1; return m; },{});
  const time = s.key==='reading' ? '27 Minuten für 50 Fragen' : s.key==='listening' ? 'Jedes Audio läuft nur einmal. Danach hast du kurze, feste Antwortzeiten.' : s.key==='writing' ? 'Build a Sentence je 30 s, E-Mail 7 Min, Diskussion 10 Min' : 'Nachsprechen 8 bis 12 s pro Satz, Interview 45 s pro Antwort';
  const extra = s.key==='speaking' ? (DICT ? 'Dein Mikrofon wird beim Antworten mitgeschrieben. Der Browser fragt beim ersten Mal nach Erlaubnis.' : 'Spracheingabe ist hier nicht verfügbar. Sprich trotzdem laut (am besten mit Handy-Aufnahme) und tippe optional mit, was du gesagt hast.') :
                s.key==='listening' ? (audioEngine() ? 'Kopfhörer auf. Das Audio startet automatisch.' : 'Keine Sprachausgabe verfügbar. Du liest stattdessen die Transkripte unter Zeitdruck.') : '';
  APP.append(h('div',{class:'panel stack narrow', style:'margin:20px auto'},
    h('span',{class:'secchip sec-'+s.key, style:'align-self:flex-start'}, SEC[s.key].name),
    h('h2',null, RUN.title.split(' · ')[0]+': '+SEC[s.key].name),
    h('ul',{style:'margin:0;padding-left:18px'}, Object.entries(T).map(([t,n])=>h('li',null, TYPES[t].name+' · '+n+'×'))),
    h('p',null,time), extra? h('p',{class:'muted'},extra):null,
    h('div',null, h('button',{class:'btn primary', onclick:()=>{ RUN.showIntro=false; if (CLOCK.section) CLOCK.section.end = Date.now()+SECTION_TIME[s.key]*1000; renderUnit(); }}, 'Abschnitt starten'))));
}

/* ---------- shared MCQ ---------- */
function mcq(qs, resp, reveal, opts={}){
  resp.ans ||= new Array(qs.length).fill(null);
  return h('div',{class:'stack'}, qs.map((q,qi)=>{
    const box = h('div',{class:'q'}, h('div',{class:'qt'}, (qs.length>1? (qi+1)+'. ':'') + q.q));
    const ol = h('div',{class:'opts'});
    q.o.forEach((o,oi)=>{
      const b = h('button',{class:'opt', 'aria-pressed':String(resp.ans[qi]===oi), disabled:reveal||null, onclick:()=>{
        resp.ans[qi]=oi; ol.querySelectorAll('.opt').forEach((x,j)=>x.setAttribute('aria-pressed',String(j===oi)));
      }}, h('span',{class:'l'},LETTERS[oi]), h('span',null,o));
      if (reveal){ if (oi===q.a) b.classList.add('right'); else if (resp.ans[qi]===oi) b.classList.add('wrong'); }
      ol.append(b);
    });
    box.append(ol);
    if (reveal){ const ok = resp.ans[qi]===q.a; box.append(h('div',{class:'explain '+(ok?'good':'bad')}, h('b',null, ok?'Richtig. ':(resp.ans[qi]==null?'Nicht beantwortet. ':'Falsch. ')+(ok?'':'Lösung: '+LETTERS[q.a]+'. ')), q.ex||'')); }
    return box;
  }));
}

/* ---------- speaker visuals ---------- */
const VOICE_PERSON = {buttery:{n:'James', c:'#2f6bd8'}, airy:{n:'Emma', c:'#0f8f86'}, glassy:{n:'Liam', c:'#8a4fd1'}, rounded:{n:'Sofia', c:'#c2476d'}};
function stageCard(voices, label, sub){
  const avs = voices.map(v=>h('div',{class:'av', style:`background:${VOICE_PERSON[v].c}`, 'data-v':v, title:VOICE_PERSON[v].n}, VOICE_PERSON[v].n[0]));
  const wave = h('div',{class:'wave'}, Array.from({length:22},()=>h('i')));
  const status = h('div',{class:'small muted'}, 'Bereit');
  const card = h('div',{class:'stagecard'}, h('div',{class:'avatars'}, avs), h('div',{style:'min-width:0'}, h('div',{class:'eyebrow'}, label), h('div',{style:'font-weight:600'}, sub), wave, status));
  return {card, set(state, vIdx){ wave.classList.toggle('on', state==='speaking'); avs.forEach((a,i)=>a.classList.toggle('talk', state==='speaking' && i===vIdx)); }, status};
}
/* Runs audio for listening units. lines:[{text,voice}] ; returns controller */
function audioPlayer(lines, ctx, onDone){
  const voices = [...new Set(lines.map(l=>l.voice))];
  const sc = stageCard(voices, ctx.label, ctx.sub);
  const r = ctx.resp;
  const btn = h('button',{class:'btn', onclick:()=>start()}, h('span',{svg:IC.play}), r.played ? 'Nochmal hören' : 'Abspielen');
  const stopB = h('button',{class:'btn ghost', hidden:true, onclick:()=>{ stopAudio(); }}, h('span',{svg:IC.stop}), 'Stopp');
  const fallback = h('div',{hidden:true});
  const controls = h('div',{class:'row', style:'margin-top:12px'}, btn, stopB);
  if (ctx.mode==='exam' && r.played) btn.hidden = true;
  function setLine(i){ const v = lines[i] && lines[i].voice; sc.set('speaking', voices.indexOf(v)); }
  const tok = TOKEN;
  function start(){
    r.played = true; btn.disabled = true; stopB.hidden=false; sc.status.textContent='Läuft …';
    ttsSink.line = e => setLine(e.line|0);
    ttsSink.state = e => { if (e.state==='speaking') {} if (e.state==='idle') sc.set('idle'); };
    setLine(0);
    play(lines).then(()=>{ if (alive(tok)) done(); }).catch(e=>{
      if (!alive(tok)) return;
      sc.set('idle');
      if (e && e.code==='stopped' && ctx.mode==='train'){ btn.disabled=false; stopB.hidden=true; sc.status.textContent='Gestoppt'; return; }
      if (e && e.code==='stopped') { done(); return; }
      sc.status.textContent = e && e.code==='none' ? 'Keine Sprachausgabe verfügbar' : 'Audio nicht möglich ('+(e&&e.code)+')';
      fallback.hidden=false; fallback.replaceChildren(h('div',{class:'directions'}, 'Audio ging nicht. Lies das Transkript stattdessen, die Fragen folgen darunter.'), transcriptEl(lines, true));
      done(true);
    });
  }
  function done(){
    ttsSink.line=null; sc.set('idle'); sc.status.textContent='Beendet'; stopB.hidden=true;
    if (ctx.mode==='train'){ btn.disabled=false; btn.lastChild.textContent='Nochmal hören'; } else btn.hidden=true;
    r.audioDone = true; onDone && onDone();
  }
  const el = h('div',null, sc.card, controls, fallback);
  return {el, start, autoStart: ()=>{ if (!r.played) { if (audioEngine()) start(); else { r.played=true; btn.hidden=true; sc.status.textContent='Keine Sprachausgabe verfügbar'; fallback.hidden=false; fallback.replaceChildren(transcriptEl(lines,true)); done(); } } }};
}
function transcriptEl(lines, plain){
  return h('div',{class:'transcript'}, h('div',{class:'eyebrow', style:'margin-bottom:6px'},'Transkript'),
    lines.map(l=>h('p',{class:'ln'}, lines.length>1 ? h('b',null, VOICE_PERSON[l.voice].n+': ') : null, l.text)));
}

/* ================= RENDERERS ================= */
const RENDER = {};

RENDER.cw = (ctx) => {
  const {item, resp, reveal} = ctx; const B = cwBuild(item);
  resp.vals ||= new Array(B.n).fill('');
  const inputs=[];
  const para = h('p',{class:'cw'}, B.first, B.toks.map(t=>{
    if (t.t!=null) return t.t;
    const inp = h('input',{type:'text', 'aria-label':'Lücke '+(t.b+1), maxlength:t.miss.length, size:Math.max(2,t.miss.length), autocomplete:'off', autocapitalize:'off', spellcheck:'false', value:resp.vals[t.b], disabled:reveal||null,
      oninput:e=>{ resp.vals[t.b]=e.target.value.trim(); if (e.target.value.length>=t.miss.length && inputs[t.b+1]) inputs[t.b+1].focus(); }});
    inp.style.width = (t.miss.length*1.25+0.8)+'ch';
    inputs[t.b]=inp;
    const parts=[h('span',{class:'stem'}, t.stem, inp)];
    if (reveal){ const ok = resp.vals[t.b].toLowerCase()===t.miss.toLowerCase(); inp.classList.add(ok?'right':'wrong'); if(!ok) parts.push(h('span',{class:'fix'}, t.stem+t.miss)); }
    return parts;
  }));
  const out = h('div',{class:'stack'}, h('div',{class:'panel'}, h('h3',{style:'margin-bottom:8px'}, item.title), para));
  if (reveal){ const sc = SCORE.cw(ctx.unit, resp); out.append(h('div',{class:'explain '+(sc.c===sc.t?'good':'bad')}, `${sc.c} von ${sc.t} richtig. Grün = korrekt. Bei Fehlern steht das richtige Wort klein daneben.`)); }
  ctx.afterMount = () => { if (!reveal && inputs[0]) inputs[0].focus({preventScroll:true}); };
  return out;
};

RENDER.daily = (ctx) => {
  const {item, resp, reveal} = ctx;
  return h('div',{class:'split'},
    h('div',{class:'docbox'}, h('div',{class:'dockind'}, item.kind), h('h3',{style:'margin-bottom:8px'}, item.title), item.text),
    mcq(item.qs, resp, reveal));
};
RENDER.acad = (ctx) => {
  const {item, resp, reveal} = ctx;
  return h('div',{class:'split'},
    h('div',{class:'passage'}, h('h3',null, item.title), item.text.split('\n\n').map(p=>h('p',null,p))),
    mcq(item.qs, resp, reveal));
};

function listeningUnit(ctx, lines, qs, label, sub){
  const {resp, reveal, mode} = ctx;
  const qWrap = h('div',{hidden: !(resp.audioDone || reveal) || null});
  const showQs = () => { qWrap.hidden=false; qWrap.replaceChildren(mcq(qs, resp, reveal)); if (mode==='exam'){ const sec = UNIT_TIME[ctx.unit.type] * (ctx.unit.type==='ltalk'? 1 : 1); setUnitClock(sec, ()=>{ toast('Zeit abgelaufen'); nextUnit(); }); } };
  const ap = audioPlayer(lines, {mode, resp, label, sub}, ()=>{ if (qWrap.hidden) showQs(); });
  ctx.ownClock = true;
  const parts = [ap.el];
  if (mode==='train' && !resp.audioDone && !reveal) parts.push(h('button',{class:'btn ghost small', style:'align-self:flex-start', onclick:(e)=>{ e.target.remove(); showQs(); }}, 'Fragen schon jetzt zeigen'));
  parts.push(qWrap);
  if (resp.audioDone || reveal) qWrap.replaceChildren(mcq(qs, resp, reveal));
  if (reveal) parts.push(transcriptEl(lines));
  if (mode==='exam' && !resp.played) ctx.afterMount = () => ap.autoStart();
  if (mode==='exam' && resp.audioDone && !reveal) ctx.afterMount = () => setUnitClock(UNIT_TIME[ctx.unit.type], ()=>{ toast('Zeit abgelaufen'); nextUnit(); });
  return h('div',{class:'stack'}, parts);
}
RENDER.lcr = (ctx) => {
  const it = ctx.item;
  return listeningUnit(ctx, [{text:it.s, voice:it.v}], [{q:'Choose the best response.', o:it.o, a:it.a, ex:it.ex}], 'Listen and choose a response', VOICE_PERSON[it.v].n+' sagt etwas zu dir');
};
RENDER.lconv = (ctx) => { const it=ctx.item; return listeningUnit(ctx, it.lines.map(l=>({text:l[2], voice:l[1]})), it.qs, 'Conversation', it.setting); };
RENDER.lann  = (ctx) => { const it=ctx.item; return listeningUnit(ctx, [{text:it.s, voice:it.v}], it.qs, 'Announcement', it.setting); };
RENDER.ltalk = (ctx) => { const it=ctx.item; return listeningUnit(ctx, it.s.split(/(?<=\.)\s+(?=[A-Z])/).reduce((acc,sen)=>{ const last=acc[acc.length-1]; if (last && (last.text+' '+sen).length<600) last.text+=' '+sen; else acc.push({text:sen, voice:it.v}); return acc; },[]), it.qs, 'Academic Talk · '+it.setting, it.title); };

RENDER.bas = (ctx) => {
  const {item, resp, reveal} = ctx;
  const chunks = [...item.ans, item.extra];
  resp.tiles ||= shuffleSeeded(chunks.map((_,i)=>i), item.id);
  resp.slots ||= new Array(item.ans.length).fill(null);
  const box = h('div');
  function draw(){
    box.replaceChildren();
    const slots = h('div',{class:'slots'}, item.pre? h('span',null,item.pre):null, resp.slots.map((ti,si)=>{
      const s = h('button',{class:'slot'+(ti!=null?' filled':''), disabled:reveal||null, 'aria-label':'Feld '+(si+1), onclick:()=>{ if (ti!=null){ resp.slots[si]=null; draw(); } }}, ti!=null? chunks[ti] : '');
      if (reveal) s.classList.add(chunks[ti]===item.ans[si] ? 'right':'wrong');
      return s;
    }), h('span',null,item.post));
    const used = new Set(resp.slots.filter(x=>x!=null));
    const tiles = h('div',{class:'tiles'}, resp.tiles.map(ti=>h('button',{class:'tile', disabled:(used.has(ti)||reveal)||null, onclick:()=>{ const k=resp.slots.indexOf(null); if(k>=0){ resp.slots[k]=ti; draw(); } }}, chunks[ti])));
    box.append(h('div',{class:'chat'}, h('div',{class:'bubble'}, item.ctx), h('div',{class:'bubble me'}, slots)), tiles);
    if (!reveal) box.append(h('p',{class:'small muted', style:'margin-top:10px'}, 'Tippe die Bausteine in der richtigen Reihenfolge an. Ein Feld antippen nimmt den Baustein zurück.'));
    if (reveal){ const ok = SCORE.bas(ctx.unit,resp).c===1; box.append(h('div',{class:'explain '+(ok?'good':'bad')}, h('b',null, ok?'Richtig. ':'Lösung: '), (item.pre?item.pre+' ':'')+item.ans.join(' ')+item.post, h('span',{class:'muted'},' · Nicht gebraucht: „'+item.extra+'“'))); }
  }
  draw();
  return h('div',{class:'panel'}, box);
};

function writingBox(ctx, minWords){
  const {resp} = ctx; resp.text ||= '';
  const wc = h('span',{class:'wc'});
  const upd = () => { const n=wordCount(resp.text); wc.textContent = n+' Wörter' + (minWords? (n<minWords?' · mindestens '+minWords:' ✓') : ''); };
  const ta = h('textarea',{id:'ta-'+ctx.unit.id, spellcheck:'false', placeholder:'Write your response here …', oninput:e=>{ resp.text=e.target.value; upd(); }});
  ta.value = resp.text; upd();
  ctx.afterMount = () => ta.focus({preventScroll:true});
  return h('div',{class:'stack-s'}, ta, h('div',{class:'row', style:'justify-content:space-between'}, wc, h('span',{class:'small muted'}, 'Rechtschreibprüfung ist wie im Test aus.')));
}
RENDER.email = (ctx) => {
  const it = ctx.item;
  return h('div',{class:'split'},
    h('div',{class:'docbox stack-s', style:'white-space:normal'}, h('div',{class:'dockind'},'Situation'), h('p',null,it.situation), h('p',{style:'font-weight:600;margin-top:8px'}, it.task), h('ul',{style:'margin:0;padding-left:18px'}, it.bullets.map(b=>h('li',null,b)))),
    writingBox(ctx, 0));
};
RENDER.disc = (ctx) => {
  const it = ctx.item;
  const post = (p, prof, color) => h('div',{class:'post'+(prof?' prof':'')}, h('div',{class:'pic', style:'background:'+color}, p.name.replace(/^(Dr\.|Professor)\s*/,'')[0]), h('div',{style:'min-width:0'}, h('div',{class:'nm'}, p.name, prof? h('span',{class:'muted small'},' · '+it.course):null), h('p',null,p.text)));
  return h('div',{class:'split'},
    h('div',{class:'forum'}, h('div',{class:'directions'}, 'Your professor is teaching a class on '+it.course.toLowerCase()+'. Write a post responding to the professor’s question. An effective response contributes to the discussion and uses at least 100 words.'),
      post(it.prof, true, '#1b5ccc'), post(it.posts[0], false, '#0f8f86'), post(it.posts[1], false, '#c2476d')),
    writingBox(ctx, 100));
};

/* ---------- speaking: listen and repeat ---------- */
function sceneSvg(seed){
  const hues = {rp1:[210,160], rp2:[265,30], rp3:[20,200]}[seed] || [210,160];
  return `<svg viewBox="0 0 140 100" role="img" aria-label="Szene"><rect width="140" height="100" fill="hsl(${hues[0]} 45% 88%)"/><rect y="70" width="140" height="30" fill="hsl(${hues[0]} 30% 75%)"/><rect x="18" y="30" width="56" height="40" rx="3" fill="hsl(${hues[1]} 40% 70%)"/><rect x="26" y="38" width="10" height="10" fill="#fff" opacity=".8"/><rect x="42" y="38" width="10" height="10" fill="#fff" opacity=".8"/><rect x="58" y="38" width="10" height="10" fill="#fff" opacity=".8"/><rect x="40" y="54" width="12" height="16" fill="hsl(${hues[1]} 35% 45%)"/><circle cx="98" cy="50" r="7" fill="hsl(${hues[0]} 40% 40%)"/><rect x="91" y="58" width="14" height="14" rx="5" fill="hsl(${hues[0]} 40% 40%)"/><circle cx="118" cy="54" r="6" fill="hsl(${hues[1]} 45% 40%)"/><rect x="112" y="61" width="12" height="11" rx="5" fill="hsl(${hues[1]} 45% 40%)"/></svg>`;
}
function micRecorder(opts){
  /* opts: seconds, onDone(text), mode; returns element. Uses dictation if available, else typed fallback. */
  const live = h('div',{class:'live'}); let finalTxt='', partial='';
  const drawLive = () => { live.replaceChildren(finalTxt, partial? h('span',{class:'part'}, (finalTxt?' ':'')+partial):null); if(!finalTxt&&!partial) live.append(h('span',{class:'muted'}, DICT? 'Hier erscheint, was du sagst.' : '')); };
  const ring = h('div',{class:'ring'}, h('span',null, fmt(opts.seconds)));
  let t0=0, iv=null, finished=false; const evts=[];
  const startTimer = () => { t0=Date.now(); iv=setInterval(()=>{ const el=(Date.now()-t0)/1000; const left=opts.seconds-el; ring.style.setProperty('--p', Math.min(100, el/opts.seconds*100)); ring.firstChild.textContent=fmt(left); if (left<=0) end(); },200); localTimers.push(iv); };
  async function end(){
    if (finished) return; finished=true; clearInterval(iv);
    if (DICT && !opts.typed){ try{ await DICT.stop(); }catch(e){} }
    const text = (finalTxt + (partial? ' '+partial:'')).trim() || (ta? ta.value.trim():'');
    dictSink.partial=dictSink.final=dictSink.state=null;
    let m = null;
    if (!opts.typed && evts.length && t0){
      const el = Math.max(1,(Date.now()-t0)/1000); let pauses=0;
      for (let i=1;i<evts.length;i++) if (evts[i]-evts[i-1]>2000) pauses++;
      m = {words: wordCount(text), secs: Math.round(el), wpm: Math.round(wordCount(text)/(el/60)), latency: Math.round((evts[0]-t0)/100)/10, pauses};
    }
    opts.onDone(text, m);
  }
  let ta=null;
  const box = h('div',{class:'stack-s'});
  if (DICT){
    const mic = h('button',{class:'mic', 'aria-label':'Aufnahme starten', svg:IC.speak});
    const stopBtn = h('button',{class:'btn small', hidden:true, onclick:()=>end()}, 'Fertig');
    mic.addEventListener('click', ()=>{
      if (mic.disabled) return; mic.disabled=true; mic.classList.add('rec');
      dictSink.partial = t => { evts.push(Date.now()); partial=t; drawLive(); };
      dictSink.final = t => { evts.push(Date.now()); finalTxt=(finalTxt+' '+t).trim(); partial=''; drawLive(); };
      dictSink.state = e => { if (e.state==='idle' && e.reason && e.reason!=='stopped' && !finished){ if (e.reason==='not_granted'||e.reason==='dismissed'){ toast('Kein Mikrofon-Zugriff. Tippe stattdessen.'); switchToTyped(); } } };
      DICT.start({language:'en'}).catch(err=>{ mic.classList.remove('rec'); toast(err && err.code==='not_granted' ? 'Mikrofon abgelehnt. Du kannst stattdessen tippen.' : 'Spracheingabe nicht möglich ('+(err&&err.code)+')'); switchToTyped(); });
      startTimer(); stopBtn.hidden=false;
    });
    drawLive();
    box.append(h('div',{class:'row', style:'gap:18px'}, mic, ring, h('div',{class:'stack-s', style:'flex:1;min-width:180px'}, h('div',{class:'small muted'}, opts.hint||'Mikrofon antippen und sprechen.'), stopBtn)), live);
  } else {
    switchToTyped(true);
  }
  function switchToTyped(initial){
    opts.typed = true;
    box.replaceChildren();
    ta = h('textarea',{style:'min-height:90px', placeholder:'Sprich laut. Tippe danach, was du gesagt hast (optional, für die Auswertung).'});
    const go = h('button',{class:'btn small', onclick:()=>{ if (!t0) { startTimer(); go.textContent='Fertig'; } else end(); }}, 'Sprechzeit starten');
    box.append(h('div',{class:'row', style:'gap:18px'}, ring, h('div',{class:'stack-s', style:'flex:1;min-width:180px'}, h('div',{class:'small muted'}, 'Ohne Spracheingabe: Starte die Zeit, sprich laut und tippe danach optional mit.'), go)), ta);
  }
  return box;
}

RENDER.repeat = (ctx) => {
  const {item, resp, mode} = ctx; resp.step ||= 0; resp.tx ||= []; resp.sc ||= [];
  ctx.ownClock = true;
  const total = item.items.length; const out = h('div',{class:'stack'});
  out.append(h('div',{class:'panel scene'}, h('div',{svg:sceneSvg(item.id)}), h('div',{class:'stack-s'}, h('div',{class:'eyebrow'},'Szenario'), h('h3',null,item.scene), h('p',{class:'muted'}, item.desc))));
  const stage = h('div',{class:'panel stack'}); out.append(stage);
  function draw(){
    stage.replaceChildren();
    if (resp.step>=total){
      const vals = resp.sc.filter(x=>x!=null); const avg = vals.length? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
      stage.append(h('h3',null,'Alle Sätze bearbeitet'), h('p',{class:'muted'}, mode==='train' ? (vals.length? `Durchschnitt ${avg.toFixed(1)} von 5.` : 'Keine Mitschrift, daher keine automatische Bewertung.') : 'Weiter zum nächsten Teil.'));
      if (mode==='train') stage.append(repeatReview(item, resp));
      setTimeout(()=>{ const nb=document.getElementById('nextBtn'); if(nb) nb.disabled=false; },0);
      return;
    }
    const i = resp.step, sen = item.items[i];
    const secs = Math.min(12, Math.max(8, Math.round(4 + words(sen).length*0.6)));
    const sc = stageCard([item.v], 'Satz '+(i+1)+' von '+total, VOICE_PERSON[item.v].n);
    stage.append(sc.card);
    const area = h('div',{class:'stack-s'}); stage.append(area);
    const tok = TOKEN;
    const listen = h('button',{class:'btn primary', onclick:()=>{
      listen.disabled=true; sc.set('speaking',0); sc.status.textContent='Hör genau zu …';
      play([{text:sen, voice:item.v}]).then(()=>{ if (alive(tok)) after(); }).catch(e=>{ if (!alive(tok)) return; sc.status.textContent='Audio nicht möglich'; area.prepend(h('div',{class:'directions'}, 'Lies den Satz einmal, dann sprich ihn auswendig nach: ', h('b',null,sen))); setTimeout(()=>{ const b=area.querySelector('.directions b'); if(b) b.textContent='(ausgeblendet)'; }, 4000); after(); });
    }}, h('span',{svg:IC.play}), 'Satz anhören');
    function after(){
      sc.set('idle'); sc.status.textContent='Jetzt nachsprechen ('+secs+' s)'; listen.hidden=true;
      area.append(micRecorder({seconds:secs, hint:'Mikrofon antippen und den Satz genau wiederholen.', onDone:(text)=>{
        resp.tx[i]=text; const r = repeatScore(sen, text); resp.sc[i] = text? r.score : (resp.self && resp.self[i]!=null ? resp.self[i] : null);
        if (mode==='train'){
          area.replaceChildren(h('div',{class:'explain '+(r.score>=4?'good':'bad')}, h('div',null,h('b',null,'Original: '), sen), h('div',{style:'margin-top:4px'}, h('b',null,'Erkannt: '), text||'(nichts)'), text? h('div',{class:'diff', style:'margin-top:6px'}, words(sen).map((w,k)=>h('span',{class:r.hit[k]?'hit':'miss'}, w)), ' ', h('span',{class:'pill'}, r.score+' / 5')) : selfRate(i)));
          area.append(h('div',null,h('button',{class:'btn primary', onclick:()=>{ resp.step++; draw(); }}, i<total-1?'Nächster Satz':'Abschließen')));
        } else { resp.step++; draw(); }
      }}));
    }
    function selfRate(k){
      resp.self ||= [];
      return h('div',{style:'margin-top:8px'}, h('div',{class:'small muted'},'Ohne Mitschrift: Wie gut war dein Nachsprechen? (ETS-Raster 0–5)'), h('div',{class:'rubric', style:'margin-top:4px'}, [5,4,3,2,1,0].map(v=>[v,String(v)]).map(([v,l])=>h('button',{class:'btn small', title:RUBRIC.repeat[v], onclick:(e)=>{ resp.self[k]=v; resp.sc[k]=v; e.target.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false')); e.target.setAttribute('aria-pressed','true'); }}, l))));
    }
    area.append(h('div',null, listen));
  }
  ctx.afterMount = () => { const nb=document.getElementById('nextBtn'); if (nb && resp.step<total) nb.disabled=true; };
  draw();
  return out;
};
function repeatReview(item, resp){
  resp = {sc: resp.sc||[], tx: resp.tx||[]};
  return h('div',{class:'stack-s'}, item.items.map((s,k)=>{ const r=repeatScore(s, resp.tx[k]||''); return h('div',{class:'small'}, h('span',{class:'pill '+(resp.sc[k]==null?'':(resp.sc[k]>=4?'good':resp.sc[k]>=2?'warn':'bad'))}, resp.sc[k]==null?'–':resp.sc[k]+'/5'), ' ', resp.tx[k]? h('span',{class:'diff'}, words(s).map((w,j)=>h('span',{class:r.hit[j]?'hit':'miss'},w))) : h('span',null,s, h('span',{class:'muted'},' (keine Mitschrift)'))); }));
}

/* ---------- speaking: interview ---------- */
RENDER.interview = (ctx) => {
  const {item, resp, mode} = ctx; if (resp.step==null) resp.step=-1; resp.tx ||= [];
  ctx.ownClock = true;
  const out = h('div',{class:'stack'});
  const sc = stageCard([item.v], 'Video-Simulation · Interviewer', VOICE_PERSON[item.v].n+' · Thema: '+item.topic);
  sc.card.querySelector('.av').style.cssText += ';width:96px;height:96px;font-size:34px';
  out.append(sc.card);
  const stage = h('div',{class:'panel stack'}); out.append(stage);
  function draw(){
    stage.replaceChildren();
    if (resp.step>=item.qs.length){
      stage.append(h('h3',null,'Interview beendet'), h('p',{class:'muted'}, mode==='train' ? 'Lass dir unten Feedback geben oder bewerte dich selbst.' : 'Die Bewertung folgt in der Auswertung.'));
      if (mode==='train') stage.append(scoringBlock('interview', ctx.unit, resp, ()=>{}));
      setTimeout(()=>{ const nb=document.getElementById('nextBtn'); if(nb) nb.disabled=false; },0);
      return;
    }
    const i = resp.step;
    const qText = i<0 ? null : item.qs[i];
    if (i<0){
      stage.append(h('p',null,'Der Interviewer stellt dir vier Fragen. Nach jeder Frage hast du 45 Sekunden. Es gibt keine Vorbereitungszeit.'),
        h('div',null,h('button',{class:'btn primary', onclick:()=>{ resp.step=0; ask(true); }}, h('span',{svg:IC.play}), 'Interview starten')));
      return;
    }
    stage.append(h('div',{class:'eyebrow'}, 'Frage '+(i+1)+' von '+item.qs.length));
    const qBox = h('p',{style:'font-weight:600', hidden: mode==='exam' || null}, qText);
    const showQ = h('button',{class:'btn ghost small', hidden: mode!=='exam' || null, onclick:()=>{ qBox.hidden=false; showQ.remove(); }}, 'Frage als Text zeigen');
    stage.append(qBox, h('div',null,showQ));
    const area = h('div',{class:'stack-s'}); stage.append(area);
    area.append(micRecorder({seconds:45, hint:'Mikrofon antippen und sofort antworten. 45 Sekunden.', onDone:(text, m)=>{
      resp.tx[i]=text; resp.fl ||= []; resp.fl[i]=m;
      if (mode==='train') { area.replaceChildren(h('div',{class:'explain'}, h('b',null,'Deine Antwort ('+wordCount(text)+' Wörter): '), text||'(keine Mitschrift)', m? h('div',{class:'small', style:'margin-top:6px'}, fluencyLine(m)) : null), h('div',null,h('button',{class:'btn primary', onclick:()=>{ resp.step++; if (resp.step<item.qs.length) ask(false); else draw(); }}, resp.step<item.qs.length-1?'Nächste Frage':'Interview beenden'))); }
      else { resp.step++; if (resp.step<item.qs.length) ask(false); else draw(); }
    }}));
  }
  function ask(withIntro){
    draw();
    const lines = []; if (withIntro) lines.push({text:item.intro, voice:item.v}); lines.push({text:item.qs[resp.step], voice:item.v});
    sc.set('speaking',0); sc.status.textContent='Spricht …';
    const tok = TOKEN; stage.querySelectorAll('.mic').forEach(m=>m.disabled=true);
    play(lines).then(()=>{ if (!alive(tok)) return; sc.set('idle'); sc.status.textContent='Du bist dran'; stage.querySelectorAll('.mic').forEach(m=>m.disabled=false); })
      .catch(()=>{ if (!alive(tok)) return; sc.set('idle'); sc.status.textContent='Audio nicht möglich, Frage steht als Text da'; const q=stage.querySelector('p[hidden]'); if(q) q.hidden=false; stage.querySelectorAll('.mic').forEach(m=>m.disabled=false); });
  }
  ctx.afterMount = () => { const nb=document.getElementById('nextBtn'); if (nb && resp.step<item.qs.length) nb.disabled=true; };
  draw();
  return out;
};

/* ================= SCORING ================= */
const SCORE = {
  cw:(u,r)=>{ const B=cwBuild(byId('cw',u.id)); let c=0; B.toks.forEach(t=>{ if(t.miss!=null && (r.vals||[])[t.b] && r.vals[t.b].toLowerCase()===t.miss.toLowerCase()) c++; }); return {c, t:B.n}; },
  mcq:(qs,r)=>({c: qs.reduce((a,q,i)=>a+((r.ans||[])[i]===q.a?1:0),0), t:qs.length}),
  bas:(u,r)=>{ const it=byId('bas',u.id); const ch=[...it.ans,it.extra]; const ok=(r.slots||[]).length===it.ans.length && r.slots.every((ti,i)=>ti!=null && ch[ti]===it.ans[i]); return {c:ok?1:0, t:1}; }
};
function objScore(u, r){
  const it = byId(u.type,u.id);
  if (u.type==='cw') return SCORE.cw(u,r);
  if (u.type==='bas') return SCORE.bas(u,r);
  if (u.type==='lcr') return SCORE.mcq([{a:it.a}], r);
  return SCORE.mcq(it.qs, r);
}
const RUN_SAVED_MSG = 'Stand gespeichert. Auf der Startseite kannst du fortsetzen.';
const OBJ_TYPES = ['cw','daily','acad','lcr','lconv','lann','ltalk','bas'];
/* ---------- skill tagging ---------- */
const SKILL_DE = {
  'r-detail':'Lesen: Detailfragen', 'r-inference':'Lesen: Schlussfolgern (Inferenz)', 'r-vocab':'Lesen: Wortbedeutung im Kontext', 'r-purpose':'Lesen: Funktion/Absicht („Why does the author mention…“)', 'r-main':'Lesen: Hauptidee/Aufbau/Zusammenfassung', 'r-not':'Lesen: NOT/EXCEPT-Fragen', 'r-attitude':'Lesen: Haltung/Bedeutung einer Aussage',
  'l-detail':'Hören: Details', 'l-inference':'Hören: Schlussfolgern', 'l-purpose':'Hören: Funktion („Why does the professor mention…“)', 'l-main':'Hören: Hauptthema', 'l-attitude':'Hören: Haltung/Gemeintes', 'l-not':'Hören: NOT-Fragen', 'l-vocab':'Hören: Wortbedeutung',
  'lcr-question':'Choose a Response: Fragen', 'lcr-request':'Choose a Response: Bitten', 'lcr-suggestion':'Choose a Response: Vorschläge/Angebote', 'lcr-statement':'Choose a Response: Aussagen/Beschwerden',
  'cw-ending':'Complete the Words: Endungen (Flexion/Wortart)', 'cw-spelling':'Complete the Words: Rechtschreibung', 'cw-word':'Complete the Words: Wort nicht erkannt', 'cw-blank':'Complete the Words: Lücke leer gelassen',
  'bas-inversion':'Build a Sentence: Inversion', 'bas-conditional':'Build a Sentence: Konditionalsätze', 'bas-indirect':'Build a Sentence: Indirekte Fragen', 'bas-passive':'Build a Sentence: Passiv', 'bas-relative':'Build a Sentence: Relativsätze', 'bas-comparison':'Build a Sentence: Vergleiche', 'bas-verbpattern':'Build a Sentence: Verbmuster (to/-ing/that)', 'bas-wordorder':'Build a Sentence: Wortstellung'
};
const BAS_TAG = {bs1:'wordorder',bs2:'wordorder',bs3:'verbpattern',bs4:'indirect',bs5:'indirect',bs6:'passive',bs7:'indirect',bs8:'comparison',bs9:'relative',bs10:'conditional',bs11:'inversion',bs12:'indirect',bs13:'conditional',bs14:'relative',bs15:'verbpattern',bs16:'verbpattern',bs17:'inversion',bs18:'verbpattern',bs19:'comparison',bs20:'passive'};
function qSkill(prefix, q){
  const t = q.q;
  if (/closest in meaning|refers to/i.test(t)) return prefix+'-vocab';
  if (/\bNOT\b|EXCEPT/.test(t)) return prefix+'-not';
  if (/why does|purpose of|function of|in order to|why .* mention/i.test(t) && !/main purpose/i.test(t)) return prefix+'-purpose';
  if (/mainly about|main idea|main purpose|main topic|main point|essential information|organization of|best describes the organization/i.test(t)) return prefix+'-main';
  if (/infer|impl|suggest|most likely|probably|would .* happen|what can be/i.test(t)) return prefix+'-inference';
  if (/attitude|opinion of|mean when|mean by|means by/i.test(t)) return prefix+'-attitude';
  return prefix+'-detail';
}
function lcrSkill(sen){
  if (/^(would you mind|could you|can you|can i|could i|any chance|would you)/i.test(sen)) return 'lcr-request';
  if (/^(why don't we|how about|let's|shall|should we|what about)/i.test(sen)) return 'lcr-suggestion';
  if (/\?\s*$/.test(sen)) return 'lcr-question';
  return 'lcr-statement';
}
function cwSkill(given, miss){
  const g=(given||'').toLowerCase(), m=miss.toLowerCase();
  if (!g) return 'cw-blank';
  const sorted = x=>x.split('').sort().join('');
  if (g.length===m.length && sorted(g)===sorted(m)) return 'cw-spelling';
  if (g.replace(/(.)\1/g,'$1')===m.replace(/(.)\1/g,'$1')) return 'cw-spelling';
  let k=0; while(k<g.length && k<m.length && g[k]===m[k]) k++;
  if (k>=1 && (m.length-k)<=4) return 'cw-ending';
  return 'cw-word';
}
/* per-question attempts of one unit: [{skill, ok, q, your, right}] */
function attemptsOf(u, r){
  const it = byId(u.type,u.id); r = r||{}; const out=[];
  if (u.type==='cw'){ const B=cwBuild(it); B.toks.forEach(t=>{ if (t.miss==null) return; const g=(r.vals||[])[t.b]||''; const ok=g.toLowerCase()===t.miss.toLowerCase(); out.push({skill: ok ? (t.miss.length<=4?'cw-ending':'cw-word') : cwSkill(g,t.miss), ok, q:t.stem+'___', your:t.stem+g, right:t.stem+t.miss}); });
    return out; }
  if (u.type==='bas'){ const ok = SCORE.bas(u,r).c===1; const ch=[...it.ans,it.extra]; out.push({skill:'bas-'+(it.skill||BAS_TAG[it.id]||'wordorder'), ok, q:it.ctx, your:(r.slots||[]).map(x=>x==null?'_':ch[x]).join(' '), right:it.ans.join(' ')}); return out; }
  if (u.type==='lcr'){ const ok=(r.ans||[])[0]===it.a; out.push({skill:lcrSkill(it.s), ok, q:it.s, your:(r.ans||[])[0]!=null? it.o[r.ans[0]]:'(keine)', right:it.o[it.a]}); return out; }
  const prefix = ['daily','acad'].includes(u.type) ? 'r' : 'l';
  it.qs.forEach((q,qi)=>{ const ok=(r.ans||[])[qi]===q.a; out.push({skill:qSkill(prefix,q), ok, q:q.q, your:(r.ans||[])[qi]!=null? q.o[r.ans[qi]]:'(keine)', right:q.o[q.a]}); });
  return out;
}
function recordStats(sync){
  if (!RUN) return; RUN.recUnits ||= {};
  const stats = store.get('stats', {}); let mist = store.get('mistakes', []);
  const skills = store.get('skills', {});      // skill -> {c,t,recent:[0/1...]}
  const recentWrong = store.get('wrongLog', []);
  const log = store.get('log', []);
  let sess = log.find(x=>x.id===RUN.id);
  if (!sess){ sess = {id:RUN.id, date:Date.now(), title:RUN.title, mode:RUN.mode, types:{}, skills:{}}; log.push(sess); }
  const done = store.get('done', {});
  const passed = (si,ui) => RUN.finished || RUN.mode==='train' || si<RUN.si || (si===RUN.si && ui<RUN.ui);
  RUN.secs.forEach((s,si)=>s.units.forEach((u,ui)=>{
    if (!(RUN.seen||{})[ukey(si,ui)] || RUN.recUnits[ukey(si,ui)]) return;
    if (!passed(si,ui)) return;
    if (!OBJ_TYPES.includes(u.type)){
      const r = RUN.resp[ukey(si,ui)] || {};
      const worked = (u.type==='email'||u.type==='disc') ? wordCount(r.text)>0 : u.type==='repeat' ? (r.step||0)>=byId('repeat',u.id).items.length : (r.step||0)>=byId('interview',u.id).qs.length;
      if (!worked) return;
      RUN.recUnits[ukey(si,ui)] = 1;
      const st = sess.types[u.type] ||= {c:0,t:0,subj:true}; st.done=(st.done||0)+1;
      done[u.type+':'+u.id] = {d:Date.now(), mode:RUN.mode, score: r.score!=null? r.score : null};
      return;
    }
    const r = RUN.resp[ukey(si,ui)];
    if (RUN.mode==='train' && !(r && r.revealed)) return;
    if (!byId(u.type,u.id)) return;
    RUN.recUnits[ukey(si,ui)] = 1;
    const sc = objScore(u, r||{});
    const st = stats[u.type] ||= {c:0,t:0}; st.c+=sc.c; st.t+=sc.t;
    const ts = sess.types[u.type] ||= {c:0,t:0}; ts.c+=sc.c; ts.t+=sc.t;
    const key = u.type+':'+u.id;
    done[key] = {d:Date.now(), mode:RUN.mode, c:sc.c, n:sc.t, best: Math.max(sc.c/sc.t, (done[key]&&done[key].best)||0)};
    const weak = sc.t>=5 ? sc.c/sc.t < 0.8 : sc.c<sc.t;
    if (weak){ if (!mist.includes(key)) mist.push(key); } else mist = mist.filter(k=>k!==key);
    for (const a of attemptsOf(u, r)){
      const k = skills[a.skill] ||= {c:0,t:0,recent:[]}; k.t++; if (a.ok) k.c++; k.recent.push(a.ok?1:0); k.recent = k.recent.slice(-30);
      const ss = sess.skills[a.skill] ||= {c:0,t:0}; ss.t++; if (a.ok) ss.c++;
      if (!a.ok) recentWrong.push({date:Date.now(), type:u.type, skill:a.skill, q:String(a.q).slice(0,200), your:String(a.your).slice(0,160), right:String(a.right).slice(0,160)});
    }
  }));
  store.set('stats', stats); store.set('mistakes', mist.slice(-300)); store.set('skills', skills); store.set('wrongLog', recentWrong.slice(-120)); store.set('done', done);
  if (RUN.mode==='exam' && RUN.finished){ try{ const res=computeResults(RUN); sess.bands={}; for (const k in res.sec) sess.bands[k]=res.sec[k].band; sess.overall=res.overall; }catch(e){} }
  store.set('log', log.filter(x=>Object.keys(x.types).length || x.id===RUN.id).slice(-80));
  if (sync) syncSession(sess);
}
/* ---------- cloud sync so Claude can read the analysis ---------- */
let DB = null;
/* ---------- sync between devices / app and browser ---------- */
function weakRatio(c,n){ return n>=5 ? c/n < 0.8 : c<n; }
function deriveAll(){
  const log = store.get('log', []);
  const stats = {}, skillsAcc = {};
  const ordered = log.slice().sort((a,b)=>(a.date||0)-(b.date||0));
  for (const x of ordered){
    for (const k in (x.types||{})){ const v=x.types[k]; if (!v.t) continue; const a=stats[k] ||= {c:0,t:0}; a.c+=v.c; a.t+=v.t; }
    for (const k in (x.skills||{})){ const v=x.skills[k]; const a=skillsAcc[k] ||= {c:0,t:0,recent:[]}; a.c+=v.c; a.t+=v.t; for (let i=0;i<v.t;i++) a.recent.push(i<v.c?1:0); a.recent=a.recent.slice(-30); }
  }
  store.set('stats', stats); store.set('skills', skillsAcc);
  const done = store.get('done', {}); const oldMist = new Set(store.get('mistakes', []));
  const mist = Object.keys(done).filter(k=>{ const d=done[k]; if (d.n) return weakRatio(d.c,d.n); return d.legacy && oldMist.has(k); });
  store.set('mistakes', mist);
}
function mergeInto(remote){
  if (!remote) return false; let changed=false;
  // done: latest attempt wins
  const done = store.get('done', {});
  for (const [k,v] of Object.entries(remote.done||{})){ const l=done[k]; if (!l || (v.d||0) > (l.d||0)){ done[k]=v; changed=true; } }
  store.set('done', done);
  // wrong answers log
  const wl = store.get('wrongLog', []); const seen = new Set(wl.map(w=>w.date+'|'+w.q));
  for (const w of (remote.recentWrong||remote.wrongLog||[])) if (!seen.has(w.date+'|'+w.q)){ wl.push(w); changed=true; }
  wl.sort((a,b)=>a.date-b.date); store.set('wrongLog', wl.slice(-150));
  // mock swaps
  const sw = store.get('mockSwap', {});
  for (const [m,map] of Object.entries(remote.mockSwap||{})){ sw[m] ||= {}; for (const [k,v] of Object.entries(map)) if (!sw[m][k]){ sw[m][k]=v; changed=true; } }
  store.set('mockSwap', sw);
  // legacy mistakes without scores
  const mist = new Set(store.get('mistakes', [])); for (const k of (remote.mistakes||[])) if (!mist.has(k) && (done[k]||{}).legacy){ mist.add(k); changed=true; }
  store.set('mistakes', [...mist]);
  return changed;
}
let SYNCING = null;
async function fullSync(){
  if (!DB) return;
  if (SYNCING) return SYNCING;
  SYNCING = (async()=>{
    try{
      // make the local legacy session id unique per device before sharing it
      let log = store.get('log', []);
      for (const x of log) if (x.id==='legacy'){ x.id = 'legacy-'+Math.random().toString(36).slice(2,8); }
      store.set('log', log);
      // 1. pull
      const [sessSnap, prof, genSnap] = await Promise.all([
        DB.collection('sessions').limit(500).get().catch(()=>null),
        DB.doc('profile/current').get().catch(()=>null),
        DB.collection('genitems').limit(500).get().catch(()=>null)
      ]);
      let changed = false;
      if (genSnap){ const g = store.get('gen', {}); for (const d of genSnap.docs){ const x=d.data()||{}; if (!x.type || !x.item || !POOL[x.type]) continue; if (!byId(x.type, x.item.id)){ POOL[x.type].push(x.item); (g[x.type] ||= []).push(x.item); changed=true; } } store.set('gen', g); }
      const remoteIds = new Set();
      if (sessSnap){ log = store.get('log', []); const have = new Set(log.map(x=>x.id)); for (const d of sessSnap.docs){ const x=d.data()||{}; remoteIds.add(x.id||d.id); if (x.id && !have.has(x.id)){ log.push(x); changed=true; } } log.sort((a,b)=>(a.date||0)-(b.date||0)); store.set('log', log.slice(-200)); }
      if (prof && prof.exists) changed = mergeInto(prof.data()) || changed;
      deriveAll();
      // 2. push what the server does not have yet
      log = store.get('log', []);
      for (const x of log) if (!remoteIds.has(x.id) && Object.keys(x.types||{}).length) await DB.doc('sessions/'+x.id).set(x).catch(()=>{});
      const g = store.get('gen', {}); const remoteGen = new Set(genSnap ? genSnap.docs.map(d=>d.id) : []);
      for (const t in g) for (const it of g[t]) if (!remoteGen.has(it.id)) await DB.doc('genitems/'+it.id).set({type:t, item:it}).catch(()=>{});
      await pushProfile();
      if (changed && VIEW!=='run') { if (VIEW==='home') renderHome(); }
    }catch(e){}
    SYNCING = null;
  })();
  return SYNCING;
}
async function pushProfile(){
  if (!DB) return;
  await DB.doc('profile/current').set({updated: Date.now(), done: store.get('done', {}), mistakes: store.get('mistakes', []), recentWrong: store.get('wrongLog', []).slice(-80), mockSwap: store.get('mockSwap', {}), skills: store.get('skills', {}), stats: store.get('stats', {})}).catch(()=>{});
}
async function syncSession(sess){
  if (!DB) return;
  try{ await DB.doc('sessions/'+sess.id).set(sess); await pushProfile(); }catch(e){}
}
let CLAUDE_FOCUS = null;
async function loadClaudeFocus(){
  if (!DB) return;
  await fullSync();
  try{ const d = await DB.doc('analysis/latest').get(); if (d.exists){ CLAUDE_FOCUS = d.data(); if (VIEW==='home') renderHome(); } }catch(e){}
}
document.addEventListener('visibilitychange', ()=>{ if (!document.hidden && VIEW==='home') fullSync(); });
/* ---------- weakness ranking ---------- */
function weaknesses(){
  const sk = store.get('skills', {});
  return Object.entries(sk).filter(([k,v])=>v.t>=4).map(([k,v])=>{ const rec=v.recent.length? v.recent.reduce((a,b)=>a+b,0)/v.recent.length : v.c/v.t; return {skill:k, acc:rec, n:v.t}; }).sort((a,b)=>a.acc-b.acc);
}
const SKILL_GEN = s => s.startsWith('cw-') ? 'cw' : s.startsWith('bas-') ? 'bas' : s.startsWith('lcr-') ? 'lcr' : s.startsWith('r-') ? (Math.random()<.5?'daily':'acad') : (Math.random()<.5?'lconv':'ltalk');
const SKILL_FOCUS = {
  'r-detail':'Most questions must be detail questions whose answer requires combining two separate pieces of information; distractors restate details from the wrong part of the text.',
  'r-inference':'Most questions must be inference questions ("What can be inferred…", "What would most likely happen if…") where the answer is never stated directly.',
  'r-vocab':'Include several vocabulary-in-context questions with C1-C2 words whose common meaning is NOT the meaning in context.',
  'r-purpose':'Include several rhetorical-function questions ("Why does the author mention X?", "In order to…").',
  'r-main':'Include main-idea, organization and best-summary questions with distractors that are true but too narrow.',
  'r-not':'Include NOT/EXCEPT questions where three options are explicitly stated in different places of the text.',
  'r-attitude':'Include questions about what a writer means by a phrase or their attitude.',
  'l-detail':'Questions focus on specific details that are mentioned once, quickly, and are paraphrased in the correct option.',
  'l-inference':'Most questions ask what a speaker implies or what will probably happen next; answers are never stated directly.',
  'l-purpose':'Include "Why does the professor/speaker mention…" questions about examples and asides.',
  'l-main':'Include main-topic questions where the opening is misleading and the real topic emerges later.',
  'l-attitude':'Include questions on speaker attitude and "What does the speaker mean when she says…".',
  'l-not':'Include NOT questions.', 'l-vocab':'Include questions on the meaning of an idiom in context.',
  'lcr-question':'All prompts are questions (yes/no, wh-, tag and negative questions) whose correct reply is indirect.',
  'lcr-request':'All prompts are requests or permission questions ("Would you mind…", "Could you…") with indirect replies, including polite refusals.',
  'lcr-suggestion':'All prompts are suggestions, invitations or offers ("Why don\'t we…", "How about…", "Shall I…") with indirect acceptances or refusals.',
  'lcr-statement':'All prompts are statements, complaints or surprising news, and the correct reply is a natural follow-up or solution.',
  'cw-ending':'Choose wording so that many blanks fall on words with derivational and inflectional endings (-tion, -ive, -ally, -ence, -ing, -ed, -s, -ies, -er/-est).',
  'cw-spelling':'Use many words with double consonants and tricky spellings (accommodate, occurrence, necessary, committee, recommend).',
  'cw-word':'Use precise academic vocabulary where the word must be inferred from context.',
  'cw-blank':'Use precise academic vocabulary where the word must be inferred from context.',
};
function focusFor(skill){
  if (skill.startsWith('bas-')) return 'All sentences must practise: '+SKILL_DE[skill].replace('Build a Sentence: ','')+'.';
  return SKILL_FOCUS[skill] || '';
}
async function targetedSession(){
  const weak = weaknesses().slice(0,3);
  if (!weak.length) throw {code:'no_data'};
  const wrong = store.get('wrongLog', []);
  const units = [];
  for (const w of weak){
    const t = SKILL_GEN(w.skill);
    const examples = wrong.filter(x=>x.skill===w.skill).slice(-4).map(x=>`- "${x.q}" | answered: "${x.your}" | correct: "${x.right}"`).join('\n');
    const extra = `\n\nTARGETED PRACTICE. The learner is weak at: ${SKILL_DE[w.skill]} (${Math.round(w.acc*100)}% correct recently). ${focusFor(w.skill)}${examples? '\nRecent mistakes of the learner, for calibration (do not reuse them):\n'+examples : ''}${CLAUDE_FOCUS && CLAUDE_FOCUS.focus ? '\nTutor notes: '+String(CLAUDE_FOCUS.focus).slice(0,600) : ''}`;
    const ids = await generate(t, extra, t==='bas'||t==='lcr' ? 5 : null);
    ids.forEach(id=>units.push({type:t, id}));
  }
  const bySec={}; for (const u of units) (bySec[TYPES[u.type].sec] ||= []).push(u);
  const secs = ['reading','listening','writing','speaking'].filter(k=>bySec[k]).map(k=>({key:k, units:bySec[k]}));
  return {mode:'train', title:'Gezieltes Training', trainType:null, secs, si:0, ui:0, resp:{}, started:Date.now(), id:'w'+Date.now()};
}
function buildMistakeRun(){
  const done = store.get('done',{});
  const mist = store.get('mistakes', []).map(k=>k.split(':')).filter(([t,id])=>POOL[t] && byId(t,id) && (!isMock(t,id) || (done[t+':'+id]||{}).mode==='exam'));
  const bySec = {};
  for (const [t,id] of mist){ (bySec[TYPES[t].sec] ||= []).push({type:t, id}); }
  const secs = ['reading','listening','writing','speaking'].filter(k=>bySec[k]).map(k=>({key:k, units:bySec[k]}));
  return {mode:'train', title:'Fehlerheft', trainType:null, secs, si:0, ui:0, resp:{}, started:Date.now(), id:'f'+Date.now()};
}
const pctBand = p => { const T=[[.97,6],[.92,5.5],[.85,5],[.77,4.5],[.68,4],[.58,3.5],[.48,3],[.38,2.5],[.28,2],[.15,1.5]]; for (const [t,b] of T) if (p>=t) return b; return 1; };
const roundHalf = x => Math.round(x*2)/2;

function computeResults(run){
  const out = {};
  run.secs.forEach((s,si)=>{
    const R = {c:0,t:0, parts:[], subj:[], incomplete:false};
    s.units.forEach((u,ui)=>{
      const r = run.resp[ukey(si,ui)] || {};
      if (['cw','daily','acad','lcr','lconv','lann','ltalk','bas'].includes(u.type)){ if (run.mode==='train' && !r.revealed) return; const sc=objScore(u,r); R.c+=sc.c; R.t+=sc.t; if(u.type==='bas'){ R.basC=(R.basC||0)+sc.c; R.basT=(R.basT||0)+sc.t; } }
      if (u.type==='email'||u.type==='disc'||u.type==='interview') R.subj.push({u, r, score:r.score});
      if (u.type==='repeat'){ const v=(r.sc||[]).filter(x=>x!=null); if (v.length) R.rep = v.reduce((a,b)=>a+b,0)/v.length; else R.incomplete=true; }
    });
    let band=null;
    if (s.key==='reading'||s.key==='listening'){ band = R.t? pctBand(R.c/R.t) : null; }
    if (s.key==='writing'){
      const comps=[]; if (R.basT) comps.push([R.basC/R.basT, .4]);
      for (const x of R.subj){ if (x.score!=null) comps.push([x.score/5, .3]); else R.incomplete=true; }
      if (comps.length){ const w=comps.reduce((a,c)=>a+c[1],0); band = pctBand(comps.reduce((a,c)=>a+c[0]*c[1],0)/w); }
    }
    if (s.key==='speaking'){
      const comps=[]; if (R.rep!=null) comps.push([R.rep/5,.5]);
      for (const x of R.subj){ if (x.score!=null) comps.push([x.score/5,.5]); else R.incomplete=true; }
      if (comps.length){ const w=comps.reduce((a,c)=>a+c[1],0); band = pctBand(comps.reduce((a,c)=>a+c[0]*c[1],0)/w); }
    }
    R.band=band; out[s.key]=R;
  });
  const bs = Object.values(out).map(x=>x.band).filter(x=>x!=null);
  const overall = bs.length ? roundHalf(bs.reduce((a,b)=>a+b,0)/bs.length) : null;
  return {sec:out, overall, full: Object.keys(out).length===4};
}

/* ---------- AI + self scoring ---------- */
function fluencyLine(m){
  const tag = m.wpm>=110?'good': m.wpm>=85?'warn':'bad';
  return [h('span',{class:'pill '+tag}, m.wpm+' Wörter/Min'), ' ', h('span',{class:'muted'}, `Start nach ${m.latency} s · ${m.pauses} Pausen über 2 s · Ziel: 110 bis 150 Wörter/Min, sofort starten`)];
}
function fluencyCap(fl){
  const ms = (fl||[]).filter(Boolean); if (!ms.length) return {cap:5, note:''};
  const wpm = ms.reduce((a,m)=>a+m.wpm,0)/ms.length, pauses = ms.reduce((a,m)=>a+m.pauses,0)/ms.length, lat = ms.reduce((a,m)=>a+m.latency,0)/ms.length;
  let cap = 5; const why=[];
  if (wpm<70){ cap=Math.min(cap,3); why.push('sehr langsames Sprechtempo'); } else if (wpm<95){ cap=Math.min(cap,4); why.push('eher langsames Sprechtempo'); }
  if (pauses>=3){ cap=Math.min(cap,3); why.push('viele lange Pausen'); }
  if (lat>4){ cap=Math.min(cap,4); why.push('später Start'); }
  return {cap, note: why.length? 'Wegen '+why.join(', ')+' höchstens '+cap+' Punkte.' : '', wpm:Math.round(wpm), pauses:Math.round(pauses*10)/10, lat:Math.round(lat*10)/10};
}
const RUBRIC = {
  email:['0: leer, themenfremd, aus der Aufgabe kopiert oder sinnlos','1: erfolglos – kurze, unverbundene Phrasen, schwere Fehler, kaum Ausführung','2: überwiegend erfolglos – etwas zusammenhängende Sprache, aber Fehler häufen sich, wenig Ausführung','3: teilweise erfolgreich – Aufgabe im Großen erfüllt, etwas Ausführung, spürbare Fehler in Satzbau, Wortschatz oder Ton','4: im Wesentlichen erfolgreich – angemessene Ausführung, Ton meist passend, wenige Fehler','5: voll erfolgreich – klar und wirksam, gut ausgeführt, durchgehend passender Ton, variierte präzise Sprache, kaum Fehler außer Tippfehlern'],
  disc:['0: leer, themenfremd, kopiert oder sinnlos','1: erfolglos – nur Wörter oder Phrasen, stark begrenzte Sprache, schwere Fehler','2: überwiegend erfolglos – Ideen schwach entwickelt oder nur teilweise relevant, begrenzter Wortschatz, Fehler häufen sich','3: teilweise erfolgreich – meist relevant und verständlich, Ausführung teils unklar oder irrelevant, spürbare Fehler','4: im Wesentlichen erfolgreich – relevant, angemessen ausgeführt, variierte Strukturen, wenige Fehler','5: voll erfolgreich – sehr relevanter, klarer Beitrag, gut ausgeführt, variierte Strukturen und präziser Wortschatz, kaum Fehler'],
  interview:['0: keine Antwort, unverständlich, nicht Englisch oder nur auswendig gelernte Phrasen','1: geht kaum auf die Frage ein, weitgehend unverständlich, einzelne Wörter','2: geht minimal auf die Frage ein, wenig relevante Ausführung, Verständlichkeit eingeschränkt, sehr begrenzte Sprache','3: beantwortet die Frage mit begrenzter Ausführung, häufige Pausen oder Füllwörter, gelegentliche Ausspracheprobleme','4: beantwortet die Frage klar und ausgeführt, einige Pausen, angemessene Grammatik und Wortschatz','5: beantwortet die Frage vollständig, flüssig, gut ausgeführt, natürliches Tempo, präzise und variierte Sprache, gut verständlich'],
  repeat:['0: keine Antwort, unverständlich','1: minimal, größtenteils fehlend','2: großer Teil fehlt oder falsch, nur Anfang wiederholt','3: ganzer Satz, aber Bedeutung nicht genau getroffen, Inhalts- oder Funktionswörter fehlen','4: Bedeutung getroffen, aber kleine Wort- oder Grammatikabweichungen','5: exakt und vollständig verständlich wiederholt']
};
function aiPrompt(kind, it, r){
  if (kind==='email') return `You are an experienced TOEFL iBT rater (2026 format, task "Write an Email", scored 0-5 integers).
Situation: ${it.situation}
${it.task}
${it.bullets.map(b=>'- '+b).join('\n')}

Candidate's email:
"""${r.text||''}"""

Use the official ETS "Write an Email" scoring guide: 5 = fully successful, clear and effective, well elaborated, consistent appropriate social conventions, varied and precise language, almost no errors other than typos; 4 = generally successful, adequate elaboration, mostly appropriate conventions, few errors; 3 = partially successful, task generally accomplished, some elaboration, noticeable errors in structure, vocabulary or conventions; 2 = mostly unsuccessful, errors accumulate, limited elaboration; 1 = unsuccessful, disconnected phrases; 0 = blank/off-topic/copied. All three bullet points must be addressed for a 4 or 5. Be a strict rater: when torn between two scores, give the lower one. Write all feedback in German, addressing the candidate as "du".
Reply with only JSON like {"score":4,"summary":"...","strengths":["..."],"improvements":["..."],"corrections":[{"original":"...","better":"..."}],"model":"a short improved English version (max 150 words)"}`;
  if (kind==='disc') return `You are an experienced TOEFL iBT rater (2026 format, task "Writing for an Academic Discussion", scored 0-5 integers).
Professor (${it.course}): ${it.prof.text}
${it.posts[0].name}: ${it.posts[0].text}
${it.posts[1].name}: ${it.posts[1].text}

Candidate's post:
"""${r.text||''}"""

Use the official ETS "Academic Discussion" scoring guide: 5 = very relevant, clearly expressed contribution, well elaborated with explanations, examples or details, varied syntactic structures and precise idiomatic vocabulary, almost no errors; 4 = relevant, adequately elaborated, variety of structures, few errors; 3 = mostly relevant and understandable, parts of elaboration missing, unclear or irrelevant, noticeable errors; 2 = mostly unsuccessful, poorly developed or partly relevant, limited range, accumulating errors; 1 = words or phrases only; 0 = blank/off-topic/copied. Fewer than 100 words usually limits the score. Be a strict rater: when torn between two scores, give the lower one. Write all feedback in German, addressing the candidate as "du".
Reply with only JSON like {"score":4,"summary":"...","strengths":["..."],"improvements":["..."],"corrections":[{"original":"...","better":"..."}],"model":"a short improved English version (max 150 words)"}`;
  return `You are an experienced TOEFL iBT speaking rater (2026 format, task "Take an Interview", each answer scored 0-5). The answers below are speech-to-text transcripts of 45-second spoken answers, so ignore punctuation and capitalisation and do not penalise small recognition errors. Use the official ETS "Take an Interview" scoring guide: 5 = fully addresses the question, fluent and well elaborated, accurate and varied grammar and vocabulary; 4 = generally addresses the question, clear and elaborated, adequate language; 3 = addresses the question with limited elaboration, frequent hesitation, limited range; 2 = minimally addresses it, little relevant elaboration, very limited language; 1 = isolated words; 0 = no response. Judge fluency from length and coherence (a 45-second answer at a natural pace is roughly 90-120 words). Be a strict rater: when torn between two scores, give the lower one.
Topic: ${it.topic}
${it.qs.map((q,i)=>`Q${i+1}: ${q}\nA${i+1}: """${(r.tx||[])[i]||''}"""${(r.fl||[])[i]? `\n(measured: ${r.fl[i].wpm} words per minute, started speaking after ${r.fl[i].latency} s, ${r.fl[i].pauses} pauses longer than 2 s)`:''}`).join('\n')}
Speech recognition removes fillers and silently fixes some errors, so be stricter on grammar and vocabulary than the transcript suggests.

Write all feedback in German, addressing the candidate as "du".
Reply with only JSON like {"scores":[4,3,4,5],"score":4,"summary":"...","strengths":["..."],"improvements":["..."],"corrections":[{"original":"...","better":"..."}],"model":"an improved English example answer for the weakest question (max 90 words)"}`;
}
async function runAI(kind, u, r){
  const it = byId(u.type,u.id);
  const res = await SAMPLE.json(aiPrompt(kind, it, r), {modelTier:'default'});
  if (!res || typeof res.score!=='number') throw {code:'invalid_json'};
  r.ai = {score: Math.max(0,Math.min(5, Math.round(res.score*2)/2)), summary:String(res.summary||''), strengths:(res.strengths||[]).map(String).slice(0,5), improvements:(res.improvements||[]).map(String).slice(0,6), corrections:(res.corrections||[]).slice(0,8).map(c=>({o:String(c.original||''), b:String(c.better||'')})), model:String(res.model||''), scores: Array.isArray(res.scores)? res.scores.map(Number):null};
  r.score = r.ai.score; r.src='ai';
  if (kind==='interview'){ const fc = fluencyCap(r.fl); r.ai.flu = fc; if (r.score>fc.cap){ r.ai.capped = r.score; r.score = fc.cap; r.ai.score = fc.cap; } }
}
function aiView(ai){
  return h('div',{class:'ai stack-s'},
    h('div',{class:'row'}, h('span',{class:'pill good'}, 'KI-Bewertung '+ai.score+' / 5'), ai.scores? h('span',{class:'small muted'}, 'pro Frage: '+ai.scores.join(' · ')):null),
    ai.flu && ai.flu.wpm ? h('p',{class:'small'}, h('b',null,'Flüssigkeit: '), `Ø ${ai.flu.wpm} Wörter/Min, Ø ${ai.flu.pauses} lange Pausen, Start nach Ø ${ai.flu.lat} s. `, ai.capped!=null ? h('span',{style:'color:var(--bad)'}, `KI-Note ${ai.capped} auf ${ai.score} gesenkt. ${ai.flu.note}`) : '') : null,
    ai.flu ? h('p',{class:'small muted'}, 'Aussprache und Betonung kann die Seite nicht hören. Die Spracherkennung glättet außerdem kleine Fehler, die echte Note kann also niedriger liegen.') : null,
    ai.summary? h('p',null,ai.summary):null,
    ai.strengths.length? h('div',null,h('b',null,'Stärken'), h('ul',null, ai.strengths.map(s=>h('li',null,s)))):null,
    ai.improvements.length? h('div',null,h('b',null,'Verbessern'), h('ul',null, ai.improvements.map(s=>h('li',null,s)))):null,
    ai.corrections.length? h('div',null,h('b',null,'Korrekturen'), h('ul',null, ai.corrections.map(c=>h('li',null, h('span',{style:'text-decoration:line-through;color:var(--bad)'}, c.o), ' → ', h('span',{style:'color:var(--good)'}, c.b))))):null,
    ai.model? h('details',null, h('summary',null,'Verbesserte Beispielversion'), h('p',{style:'margin-top:8px;white-space:pre-line'}, ai.model)):null);
}
function scoringBlock(kind, u, r, onChangeOrig){
  const onChange = () => { const d=store.get('done',{}); const k=u.type+':'+u.id; if (r.score!=null){ d[k]=Object.assign(d[k]||{d:Date.now()}, {score:r.score}); store.set('done',d); } onChangeOrig(); };
  const box = h('div',{class:'stack-s'});
  function draw(){
    box.replaceChildren();
    const empty = kind==='interview' ? !(r.tx||[]).some(Boolean) : !wordCount(r.text);
    if (r.ai) box.append(aiView(r.ai));
    if (SAMPLE && !AI_OFF && !r.ai){
      const b = h('button',{class:'btn primary small', disabled: empty || null, onclick:async()=>{
        b.disabled=true; b.textContent='Wird bewertet …';
        try{ await runAI(kind,u,r); onChange(); draw(); }
        catch(e){ b.disabled=false; b.textContent='Mit KI bewerten';
          if (e && e.code==='not_granted'){ AI_OFF=true; toast('KI-Bewertung ist für diese Seite ausgeschaltet. Nutze die Selbsteinschätzung.'); draw(); }
          else if (e && e.code==='rate_limited') toast('Gerade zu viele Anfragen. Versuch es in einer Minute nochmal.');
          else toast('Bewertung fehlgeschlagen. Nochmal versuchen.'); }
      }}, 'Mit KI bewerten');
      box.append(h('div',{class:'row'}, b, h('span',{class:'small muted'}, empty? 'Keine Antwort vorhanden.' : 'Feedback auf Deutsch, Skala 0 bis 5')));
    }
    if (!r.ai){
      box.append(h('div',{class:'small muted'}, SAMPLE && !AI_OFF ? 'Oder selbst einschätzen:' : 'Selbst einschätzen nach Raster:'));
      box.append(h('div',{class:'rubric'}, [0,1,2,3,4,5].map(v=>h('button',{class:'btn small', 'aria-pressed':String(r.score===v), title:RUBRIC[kind][v], onclick:()=>{ r.score=v; r.src='self'; onChange(); draw(); }}, String(v)))));
      box.append(h('details',null, h('summary',{class:'small'},'Bewertungsraster'), h('ul',{class:'small', style:'margin:8px 0 0;padding-left:18px'}, RUBRIC[kind].map(x=>h('li',null,x)))));
    }
  }
  draw(); return box;
}

/* ================= RESULTS ================= */
function renderResults(){
  renderBar(); APP.replaceChildren();
  const res = computeResults(RUN);
  if (RUN.mode==='train') return renderTrainResults(res);
  saveHistory(res);
  const wrap = h('div',{class:'stack'});
  wrap.append(h('div',null, h('div',{class:'eyebrow'},'Auswertung'), h('h1',null, RUN.title)));
  const tiles = h('div',{class:'bands'});
  for (const k of ['reading','listening','writing','speaking']){
    const R = res.sec[k];
    if (!R){ tiles.append(h('div',{class:'bandtile'}, h('span',{class:'eyebrow sec-'+k}, SEC[k].name), h('span',{class:'v muted'},'–'), h('span',{class:'small muted'},'nicht bearbeitet'))); continue; }
    const sub = (k==='reading'||k==='listening') ? `${R.c} / ${R.t} richtig` : (R.incomplete ? 'Bewertung unvollständig' : 'mit Bewertung');
    tiles.append(h('div',{class:'bandtile sec-'+k}, h('span',{class:'eyebrow', style:'color:inherit'}, SEC[k].name), h('span',{class:'v', style:'color:var(--ink)'}, R.band!=null? R.band.toFixed(1):'–'), h('span',{class:'small muted'}, sub), R.band? h('div',{class:'meter'}, h('i',{style:`width:${R.band/6*100}%`})):null));
  }
  tiles.append(h('div',{class:'bandtile overall'}, h('span',{class:'eyebrow', style:'color:inherit'}, res.full?'Gesamt':'Durchschnitt'), h('span',{class:'v'}, res.overall!=null? res.overall.toFixed(1):'–'), h('span',{class:'small muted'}, res.overall!=null? `${CEFR(res.overall)} · ≈ ${CONC[res.overall]} (0–120)` : '')));
  wrap.append(tiles);
  wrap.append(h('p',{class:'small muted'},'Geschätzte Bänder aus dem Anteil richtiger Antworten bzw. der 0–5-Bewertungen. Der echte Test ist adaptiv und anders gewichtet, rechne mit ±0,5 Band. '+(res.full?'':'Gesamtwert nur aus den bearbeiteten Abschnitten.')));

  // subjective scoring
  const subj = []; RUN.secs.forEach((s,si)=>s.units.forEach((u,ui)=>{ if (['email','disc','interview'].includes(u.type)) subj.push({u, r:RUN.resp[ukey(si,ui)]||(RUN.resp[ukey(si,ui)]={})}); }));
  if (subj.length){
    wrap.append(h('h2',{style:'margin-top:16px'},'Writing und Speaking bewerten'));
    for (const {u,r} of subj){
      const it = byId(u.type,u.id);
      const answer = u.type==='interview'
        ? h('div',{class:'stack-s'}, it.qs.map((q,i)=>h('div',{class:'small'}, h('b',null,q), h('div',null,(r.tx||[])[i]||h('span',{class:'muted'},'(keine Mitschrift)')))))
        : h('div',{class:'transcript', style:'white-space:pre-wrap'}, r.text||h('span',{class:'muted'},'(leer)'), h('div',{class:'wc', style:'margin-top:6px'}, wordCount(r.text)+' Wörter'));
      wrap.append(h('div',{class:'panel stack-s'}, h('div',{class:'row', style:'justify-content:space-between'}, h('h3',null, TYPES[u.type].name), r.score!=null? h('span',{class:'pill'}, r.score+' / 5 · '+(r.src==='ai'?'KI':'selbst')):h('span',{class:'pill warn'},'offen')),
        answer, scoringBlock(u.type, u, r, ()=>{ const y=window.scrollY; renderResults(); window.scrollTo(0,y); })));
    }
  }

  // review
  wrap.append(h('h2',{style:'margin-top:16px'},'Alle Aufgaben mit Lösungen'));
  RUN.secs.forEach((s,si)=>{
    const det = h('details',null, h('summary',null, SEC[s.key].name+(res.sec[s.key].t? ` · ${res.sec[s.key].c}/${res.sec[s.key].t}` : '')));
    const body = h('div',{class:'stack', style:'margin-top:12px'});
    s.units.forEach((u,ui)=>body.append(reviewUnit(u, RUN.resp[ukey(si,ui)]||{})));
    det.append(body); wrap.append(det);
  });
  wrap.append(h('div',{class:'row', style:'margin-top:12px'}, h('button',{class:'btn primary', onclick:()=>goHome(true)},'Zur Startseite'), weakest(res)));
  APP.append(wrap);
}
function weakest(res){
  // find weakest objective type to suggest training
  const stats={};
  RUN.secs.forEach((s,si)=>s.units.forEach((u,ui)=>{ if (['email','disc','interview','repeat'].includes(u.type)) return; const sc=objScore(u,RUN.resp[ukey(si,ui)]||{}); stats[u.type]=stats[u.type]||{c:0,t:0}; stats[u.type].c+=sc.c; stats[u.type].t+=sc.t; }));
  const arr = Object.entries(stats).filter(([,v])=>v.t).sort((a,b)=>a[1].c/a[1].t-b[1].c/b[1].t);
  if (!arr.length) return null; const [t,v]=arr[0];
  return h('button',{class:'btn', onclick:()=>startRun(buildTrain(t))}, 'Schwächster Typ trainieren: '+TYPES[t].name+' ('+Math.round(v.c/v.t*100)+' %)');
}
function reviewUnit(u, r){
  const it = byId(u.type,u.id); const T=TYPES[u.type];
  const head = h('div',{class:'eyebrow'}, T.name);
  if (['daily','acad','lcr','lconv','lann','ltalk'].includes(u.type)){
    const qs = u.type==='lcr' ? [{q:'Choose the best response.', o:it.o, a:it.a, ex:it.ex}] : it.qs;
    const parts=[head];
    if (u.type==='daily') parts.push(h('div',{class:'docbox small'}, it.text));
    if (u.type==='acad') parts.push(h('details',null,h('summary',{class:'small'}, 'Text: '+it.title), h('p',{class:'small', style:'white-space:pre-line;margin-top:8px'}, it.text)));
    if (u.type.startsWith('l')) parts.push(transcriptEl(u.type==='lconv'? it.lines.map(l=>({text:l[2],voice:l[1]})) : [{text:it.s, voice:it.v}]));
    parts.push(mcq(qs, r, true));
    return h('div',{class:'stack-s'}, parts);
  }
  if (u.type==='cw'){ const fake={item:it, resp:r, reveal:true, unit:u}; return h('div',{class:'stack-s'}, head, RENDER.cw(fake)); }
  if (u.type==='bas'){ const fake={item:it, resp:r, reveal:true, unit:u}; return h('div',{class:'stack-s'}, head, RENDER.bas(fake)); }
  if (u.type==='repeat') return h('div',{class:'stack-s'}, head, repeatReview(it, r));
  return h('div',{class:'stack-s'}, head, h('p',{class:'small muted'}, 'Siehe Bewertung oben.'));
}
function renderTrainResults(res){
  if (!RUN.trainType){
    const wrap = h('div',{class:'stack narrow', style:'margin:0 auto'}, h('div',{class:'eyebrow'},'Training beendet'), h('h1',null, RUN.title));
    let c=0,t=0; for (const k in res.sec){ c+=res.sec[k].c; t+=res.sec[k].t; }
    if (t) wrap.append(h('div',{class:'panel'}, h('div',{style:'font-family:var(--f-display);font-size:40px;font-weight:700'}, `${c} / ${t}`), h('p',{class:'muted'}, 'Richtig gelöste Aufgaben verschwinden aus dem Fehlerheft. Noch offen: '+store.get('mistakes',[]).length+'.')));
    wrap.append(h('div',{class:'row'}, h('button',{class:'btn primary', onclick:()=>goHome(true)},'Startseite')));
    APP.append(wrap); return;
  }
  const R = Object.values(res.sec)[0]; const t = RUN.trainType;
  const wrap = h('div',{class:'stack narrow', style:'margin:0 auto'});
  wrap.append(h('div',{class:'eyebrow'},'Training beendet'), h('h1',null, TYPES[t].name));
  if (R.t) wrap.append(h('div',{class:'panel'}, h('div',{style:'font-family:var(--f-display);font-size:40px;font-weight:700'}, `${R.c} / ${R.t}`), h('p',{class:'muted'}, Math.round(R.c/R.t*100)+' % richtig in den '+RUN.secs[0].units.filter((u,ui)=>(RUN.resp[ukey(0,ui)]||{}).revealed).length+' geprüften Aufgaben · entspricht grob Band '+pctBand(R.c/R.t).toFixed(1))));
  if (t==='email'||t==='disc'){
    RUN.secs[0].units.forEach((u,ui)=>{ const r=RUN.resp[ukey(0,ui)]; if(!r||!wordCount(r.text)) return; wrap.append(h('div',{class:'panel stack-s'}, h('h3',null, 'Aufgabe '+(ui+1)), h('div',{class:'transcript', style:'white-space:pre-wrap'}, r.text), scoringBlock(t,u,r,()=>{}))); });
    if (!RUN.secs[0].units.some((u,ui)=>wordCount((RUN.resp[ukey(0,ui)]||{}).text))) wrap.append(h('p',{class:'muted'},'Keine Texte geschrieben.'));
  }
  if (t==='repeat'){ RUN.secs[0].units.forEach((u,ui)=>{ const r=RUN.resp[ukey(0,ui)]; if(r && r.sc && r.sc.length) wrap.append(h('div',{class:'panel stack-s'}, h('h3',null, byId('repeat',u.id).scene), repeatReview(byId('repeat',u.id), r))); }); }
  wrap.append(h('div',{class:'row'}, h('button',{class:'btn primary', onclick:()=>startRun(buildTrain(t))},'Nochmal'), h('button',{class:'btn', onclick:()=>goHome(true)},'Startseite')));
  APP.append(wrap);
}
function saveHistory(res){
  const hist = store.get('history', []);
  const b = {}; for (const k in res.sec) b[k]=res.sec[k].band;
  const entry = {id:RUN.id, date:RUN.finished||Date.now(), title:RUN.title, b, overall:res.overall};
  const i = hist.findIndex(x=>x.id===RUN.id); if (i>=0) hist[i]=entry; else hist.push(entry);
  store.set('history', hist.slice(-30));
}



/* ---------- migrate data from earlier versions ---------- */
(function migrate(){
  if (store.get('mig2', false)) return;
  const log = store.get('log', []); const done = store.get('done', {});
  const stats = store.get('stats', {});
  if (Object.keys(stats).length && !log.some(x=>x.id==='legacy')) log.unshift({id:'legacy', date:Date.now()-864e5, title:'Frühere Übungen', mode:'train', types:JSON.parse(JSON.stringify(stats)), skills:{}, legacy:true});
  for (const h of store.get('history', [])){ if (!log.some(x=>x.id===h.id)) log.push({id:h.id, date:h.date, title:h.title, mode:'exam', types:{}, skills:{}, bands:h.b, overall:h.overall, legacy:true}); }
  for (const k of store.get('mistakes', [])) if (!done[k]) done[k] = {d:null, legacy:true};
  log.sort((a,b)=>a.date-b.date);
  store.set('log', log.slice(-80)); store.set('done', done); store.set('mig2', true);
})();
(function migrate3(){
  if (store.get('mig3', false)) return;
  const done = store.get('done', {});
  store.set('mistakes', store.get('mistakes', []).filter(k=>{ const d=done[k]; return !(d && d.n>=5 && d.c/d.n>=0.8); }));
  store.set('mig3', true);
})();
/* ---------- progress panel ---------- */
function sparkline(vals, modes){
  const W=280,H=56,P=6; if (vals.length<2) return null;
  const x=i=>P+i*(W-2*P)/(vals.length-1), y=v=>H-P-v*(H-2*P);
  const pts=vals.map((v,i)=>x(i)+','+y(v)).join(' ');
  return h('div',{style:'max-width:100%;overflow:hidden', svg:`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%" role="img" aria-label="Verlauf der Trefferquote">`+
    `<line x1="${P}" x2="${W-P}" y1="${y(.85)}" y2="${y(.85)}" stroke="var(--good)" stroke-dasharray="3 3" stroke-width="1"/>`+
    `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`+
    vals.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${modes[i]==='exam'?4:2.5}" fill="${modes[i]==='exam'?'var(--accent)':'var(--surface)'}" stroke="var(--accent)" stroke-width="1.5"/>`).join('')+'</svg>'});
}
function progressPanel(){
  const fullLog = store.get('log', []);
  const log = fullLog.filter(x=>Object.keys(x.types||{}).some(k=>x.types[k].t));
  const exams = fullLog.filter(x=>x.mode==='exam' && x.overall!=null);
  const wrap = h('div',{class:'stack'});
  if (CLAUDE_FOCUS && (CLAUDE_FOCUS.summary || CLAUDE_FOCUS.focus)){
    wrap.append(h('div',{class:'panel stack-s', style:'border-color:var(--accent)'}, h('div',{class:'eyebrow'}, 'Analyse von Claude'+(CLAUDE_FOCUS.date? ' · '+CLAUDE_FOCUS.date:'')),
      CLAUDE_FOCUS.summary? h('p',{style:'white-space:pre-line'}, String(CLAUDE_FOCUS.summary)) : null,
      CLAUDE_FOCUS.focus? h('p',{class:'small muted'}, 'Fließt in „Gezielt trainieren“ ein: '+String(CLAUDE_FOCUS.focus)) : null));
  }
  if (exams.length){ wrap.append(h('div',{class:'panel stack-s'}, h('b',null,'Probetest-Ergebnisse'), h('div',{class:'row'}, exams.slice(-8).map(x=>h('span',{class:'pill', title:x.title}, new Date(x.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+': Band '+x.overall.toFixed(1)))))); }
  if (!log.length){ wrap.append(h('div',{class:'panel'}, h('p',{class:'muted'},'Für Lesen, Hören und Build a Sentence sind in diesem Browser noch keine ausgewerteten Antworten gespeichert. Gezählt werden Aufgaben, bei denen du im Training „Antwort prüfen“ geklickt oder einen Probetestteil abgeschlossen hast. Ab jetzt wird jede Antwort gespeichert und zusätzlich gesichert, sodass dein Stand auch auf anderen Geräten wieder auftaucht.'))); return wrap; }
  // overall trend
  const acc = x=>{ let c=0,t=0; for (const k in x.types){ c+=x.types[k].c; t+=x.types[k].t; } return t? c/t : 0; };
  const last = log.slice(-15);
  const sp = sparkline(last.map(acc), last.map(x=>x.mode));
  const top = h('div',{class:'panel stack-s'}, h('div',{class:'row', style:'justify-content:space-between'}, h('b',null,'Trefferquote pro Sitzung'), h('span',{class:'small muted'},'● Probetest  ○ Training  - - 85 %')), sp || h('p',{class:'small muted'},'Ab zwei Sitzungen erscheint hier ein Verlauf.'));
  wrap.append(top);
  // training vs test per type
  const agg = mode => { const o={}; for (const x of log.filter(l=>l.mode===mode)) for (const k in x.types){ const a=o[k] ||= {c:0,t:0}; a.c+=x.types[k].c; a.t+=x.types[k].t; } return o; };
  const tr=agg('train'), ex=agg('exam');
  const cell = v => v && v.t ? h('td',null, h('span',{class:'pill '+(v.c/v.t>=.85?'good':v.c/v.t>=.7?'warn':'bad')}, Math.round(v.c/v.t*100)+' %'), h('span',{class:'muted small'},' ('+v.t+')')) : h('td',{class:'muted'},'–');
  wrap.append(h('div',{class:'panel tbl-wrap'}, h('table',null,
    h('thead',null,h('tr',null, h('th',null,'Aufgabentyp'), h('th',null,'Training'), h('th',null,'Probetest'))),
    h('tbody',null, OBJ_TYPES.filter(t=>tr[t]||ex[t]).map(t=>h('tr',null, h('td',null,TYPES[t].name), cell(tr[t]), cell(ex[t]))))),
    h('p',{class:'small muted', style:'margin-top:8px'},'Liegt der Probetest deutlich unter dem Training, fehlt dir meist Tempo unter Zeitdruck, nicht das Verständnis.')));
  // weaknesses
  const weak = weaknesses().slice(0,5);
  const wp = h('div',{class:'panel stack-s'}, h('b',null,'Deine größten Schwächen'));
  if (!weak.length) wp.append(h('p',{class:'small muted'},'Sobald je Fragetyp ein paar Antworten gesammelt sind, siehst du hier, wo du am meisten verlierst.'));
  weak.forEach(w=>wp.append(h('div',{class:'row'}, h('span',{class:'pill '+(w.acc>=.85?'good':w.acc>=.7?'warn':'bad'), style:'min-width:52px;text-align:center'}, Math.round(w.acc*100)+' %'), h('span',null, SKILL_DE[w.skill]||w.skill), h('span',{class:'small muted'}, '· '+w.n+' Antworten'))));
  if (weak.length && SAMPLE && !AI_OFF){
    const b = h('button',{class:'btn primary', onclick:async()=>{ b.disabled=true; b.textContent='Erzeuge passende Aufgaben …';
      try{ startRun(await targetedSession()); }catch(e){ b.disabled=false; b.textContent='Schwächen gezielt trainieren'; toast(e && e.code==='rate_limited' ? 'Gerade zu viele Anfragen, bitte gleich nochmal.' : 'Erzeugen hat nicht geklappt, bitte nochmal versuchen.'); } }}, 'Schwächen gezielt trainieren');
    wp.append(h('div',{style:'margin-top:6px'}, b), h('p',{class:'small muted'},'Die KI schreibt neue Aufgaben genau für deine drei schwächsten Fragetypen und nutzt deine letzten Fehler als Vorlage.'));
  }
  wrap.append(wp);
  return wrap;
}

/* ================= AI-GENERATED ITEMS ================= */
const GEN_COMMON = `You write original practice items for the 2026 TOEFL iBT at the level of the HARDER second-stage module (CEFR C1 to C2). Use American English and natural, authentic language. Every multiple-choice question has exactly 4 options, exactly ONE defensible correct answer, and three PLAUSIBLE distractors (true-but-irrelevant details, misread conditions, overgeneralizations, reversed relationships, words repeated from the text used in the wrong sense). Never use absurd or joke distractors. Options should have similar length. "a" is the 0-based index of the correct option. "ex" is a short explanation in German (1-2 sentences, informal "du"), naming why the answer is right and, where useful, why the most tempting distractor is wrong, WITHOUT referring to options by letter. Vary topics. Reply with only a JSON array.`;
const GEN = {
  cw:{n:2, prompt:`Create 2 "Complete the Words" paragraphs. Each object: {"title": string, "text": string}. text = one academic paragraph of 75 to 95 words in the style of a university textbook (dense academic vocabulary, complex sentences), on topics like biology, geology, psychology, economics, history of science, engineering. The first sentence must be complete and end with a period. Avoid digits, abbreviations, hyphenated words and, after the first sentence, any names of people, places, organizations or brands: the task tests English, not general knowledge.`},
  daily:{n:3, prompt:`Create 3 "Read in Daily Life" texts. Each object: {"kind": e.g. "Email"|"Notice"|"Text message chain"|"Schedule"|"Advertisement"|"Social media post"|"Policy excerpt", "title": string, "text": string (70 to 150 words, realistic campus or everyday text with conditions, exceptions, dates or numbers; use \n for line breaks), "qs": [3 questions {"q","o":[4],"a","ex"}]}. Include at least one inference question ("What can be inferred…" / "What would most likely happen if…"), one question about purpose or a phrase's meaning in context, and one detail question that requires combining two pieces of information.`},
  acad:{n:1, prompt:`Create 1 "Read an Academic Passage" item: {"title": string, "text": string (190 to 220 words, two paragraphs separated by \n\n, university-level expository prose with C1-C2 vocabulary), "qs": [5 questions {"q","o":[4],"a","ex"}]}. Question types: one factual detail, one inference, one vocabulary-in-context ("The word \"X\" in paragraph N is closest in meaning to"), one rhetorical purpose ("Why does the author mention…"), and one about the passage's organization or the best summary sentence.`},
  lcr:{n:8, prompt:`Create 8 "Listen and Choose a Response" items. Use casual, idiomatic native-speaker phrasing (reductions, idioms, tag questions). Each object: {"s": one spoken sentence of at most 15 words (a question, request, suggestion, complaint or remark in a campus or everyday situation), "o":[4 written replies], "a", "ex"}. The correct reply is usually INDIRECT (it answers implicitly, e.g. "I'm still waiting on Mark's numbers" to "Have you finished the report?"). Distractors must be grammatical and topically related: reuse a word from the prompt in another sense, answer a different wh-question (when vs. how long vs. where), use the wrong time frame, or be related but non-responsive.`},
  lconv:{n:3, prompt:`Create 3 "Listen to a Conversation" items. Each object: {"setting": short description, "lines": [["W" or "M", text], ...] (5 to 7 turns, 90 to 130 words total, casual spoken English between native speakers: contractions, reductions like gonna/wanna/kinda, fillers like um/uh/like/you know, false starts, idioms and slang that a university student would hear), "qs": [2 questions {"q","o":[4],"a","ex"}]}. At least one question per conversation asks about an implication, a speaker's purpose, or what a speaker means by a quoted phrase.`},
  lann:{n:2, prompt:`Create 2 "Listen to an Announcement" items. Each object: {"setting": short description, "s": spoken announcement of 60 to 90 words in natural, informal spoken style, with a change, an exception or a condition, "qs": [2 questions {"q","o":[4],"a","ex"}]}.`},
  ltalk:{n:1, prompt:`Create 1 "Listen to an Academic Talk" item: {"setting": e.g. "Geology lecture", "title": string, "s": spoken lecture excerpt of 200 to 240 words in a natural conversational lecturing style (contractions, asides like 'so', 'okay', 'right?', rhetorical questions) with signposting and at least one place where the professor qualifies or doubts a claim, "qs": [4 questions {"q","o":[4],"a","ex"}]}. Questions: main idea, a detail, the function of something the professor mentions, and the professor's attitude or an inference.`},
  bas:{n:6, prompt:`Create 6 "Build a Sentence" items. Each object: {"ctx": what person A says (a question or remark), "pre": words before the blanks (may be ""), "ans": [4 chunks in correct order], "post": final punctuation such as "." or "?", "extra": one distractor chunk}. B's reply must be a natural response to ctx. Use demanding structures (inversion after negative adverbials, mixed conditionals, indirect questions, reduced relative clauses, passive infinitives, gerund vs. infinitive). The extra chunk must make the sentence ungrammatical wherever it is placed, and only ONE order of the 4 chunks may be correct. Add "skill": one of "inversion","conditional","indirect","passive","relative","comparison","verbpattern","wordorder".`}
};
const VOICES = ['buttery','airy','glassy','rounded'];
function rndVoice(){ return VOICES[Math.floor(Math.random()*4)]; }
function validMCQ(q){ return q && typeof q.q==='string' && Array.isArray(q.o) && q.o.length===4 && q.o.every(x=>typeof x==='string') && Number.isInteger(q.a) && q.a>=0 && q.a<4; }
function normGen(type, x, id){
  const str = v => typeof v==='string' && v.trim().length>0;
  const qs = v => Array.isArray(v) && v.length>=1 && v.every(validMCQ) ? v.map(q=>({q:q.q, o:q.o.slice(), a:q.a, ex:String(q.ex||'')})) : null;
  let it=null;
  if (type==='cw' && str(x.text) && /[.!?]\s/.test(x.text)) it={id, title:String(x.title||'Academic Paragraph'), text:x.text.replace(/\s+/g,' ').trim()};
  if (type==='daily' && str(x.text) && qs(x.qs)) it={id, kind:String(x.kind||'Text'), title:String(x.title||''), text:x.text, qs:qs(x.qs)};
  if (type==='acad' && str(x.text) && qs(x.qs)) it={id, title:String(x.title||''), text:x.text, qs:qs(x.qs)};
  if (type==='lcr' && str(x.s) && validMCQ({q:'x',o:x.o,a:x.a})) it={id, v:rndVoice(), s:x.s, o:x.o.slice(), a:x.a, ex:String(x.ex||'')};
  if (type==='lconv' && Array.isArray(x.lines) && x.lines.length>=3 && qs(x.qs)){ const vw=Math.random()<.5?'rounded':'airy', vm=Math.random()<.5?'buttery':'glassy'; it={id, setting:String(x.setting||'Conversation'), lines:x.lines.filter(l=>Array.isArray(l)&&str(l[1])).map(l=>[l[0]==='M'?'M':'W', l[0]==='M'?vm:vw, String(l[1])]), qs:qs(x.qs)}; }
  if (type==='lann' && str(x.s) && qs(x.qs)) it={id, v:rndVoice(), setting:String(x.setting||'Announcement'), s:x.s, qs:qs(x.qs)};
  if (type==='ltalk' && str(x.s) && qs(x.qs)) it={id, v:rndVoice(), setting:String(x.setting||'Lecture'), title:String(x.title||''), s:x.s, qs:qs(x.qs)};
  if (type==='bas' && str(x.ctx) && Array.isArray(x.ans) && x.ans.length>=3 && x.ans.every(str) && str(x.extra)) it={id, ctx:x.ctx, pre:String(x.pre||''), ans:x.ans.map(String), post:String(x.post||'.'), extra:String(x.extra), skill: ['inversion','conditional','indirect','passive','relative','comparison','verbpattern','wordorder'].includes(x.skill)? x.skill : 'wordorder'};
  if (!it) return null;
  if (it.qs) it.qs.forEach(q=>__shuf(q, Math.floor(Math.random()*4)));
  if (type==='lcr') __shuf(it, Math.floor(Math.random()*4));
  it.gen = true;
  return it;
}
function loadGenerated(){
  const g = store.get('gen', {});
  for (const t in g){ if (!POOL[t]) continue; for (const it of g[t]) if (!byId(t,it.id)) POOL[t].push(it); }
}
async function generate(type, extra, count){
  const spec = GEN[type];
  const avoid = POOL[type].slice(-12).map(x=>x.title||x.s||x.ctx||'').filter(Boolean).join(' | ').slice(0,800);
  const arr = await SAMPLE.json(GEN_COMMON+'\n\n'+(count? spec.prompt.replace(/Create \d+/, 'Create '+count) : spec.prompt)+(extra||'')+(avoid? '\n\nAvoid repeating these existing topics: '+avoid : ''), {modelTier:'default'});
  const list = Array.isArray(arr) ? arr : (arr && Array.isArray(arr.items) ? arr.items : []);
  const ids=[]; const g = store.get('gen', {}); g[type] ||= [];
  list.forEach((x,i)=>{ const it = normGen(type, x||{}, 'g'+type+Date.now().toString(36)+i); if (it){ POOL[type].push(it); g[type].push(it); ids.push(it.id); } });
  if (!ids.length) throw {code:'invalid_json'};
  g[type] = g[type].slice(-120); store.set('gen', g);
  if (DB) for (const id of ids){ const it=byId(type,id); DB.doc('genitems/'+id).set({type, item:it}).catch(()=>{}); }
  return ids;
}
loadGenerated();

/* keyboard: A-D for options, Enter for next (exam only when not typing) */
document.addEventListener('keydown', e=>{
  if (VIEW!=='run') return; const tag=(e.target.tagName||'').toLowerCase(); if (tag==='input'||tag==='textarea') return;
  const k=e.key.toUpperCase(); const qs=[...APP.querySelectorAll('.q')];
  if (qs.length===1 && 'ABCD'.includes(k) && k.length===1){ const b=qs[0].querySelectorAll('.opt')['ABCD'.indexOf(k)]; if (b && !b.disabled){ b.click(); e.preventDefault(); } }
});

renderHome();
</script>
