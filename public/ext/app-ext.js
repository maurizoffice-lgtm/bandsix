/* Bandsix app layer: runs after the prototype engine (classic script, shared global scope).
   It replaces the single long home page with a tabbed dashboard, adds the app navigation,
   a personal test date, offline weakness training and progress export/import.
   Engine functions and data (POOL, MOCKS, TYPES, store, h, startRun, ...) are reused as is. */
(function(){
  const TABS = [
    {id:'start', label:'Start', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>'},
    {id:'tests', label:'Probetests', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/></svg>'},
    {id:'training', label:'Training', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>'},
    {id:'progress', label:'Fortschritt', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>'},
    {id:'more', label:'Mehr', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'}
  ];
  const SECS = ['reading','listening','writing','speaking'];
  let TAB = 'start';
  try { const t = sessionStorage.getItem('bandsix.tab'); if (TABS.some(x=>x.id===t)) TAB = t; } catch(e){}
  const TABBAR = document.getElementById('tabbar');

  function setTab(id){
    TAB = id; try { sessionStorage.setItem('bandsix.tab', id); } catch(e){}
    if (VIEW==='run') return;
    renderHome(); window.scrollTo({top:0});
  }

  /* ---------- navigation ---------- */
  function navButtons(cls){
    return TABS.map(t=>h('button',{class:cls+(VIEW==='home' && TAB===t.id?' on':''), 'aria-current': VIEW==='home' && TAB===t.id ? 'page' : null, onclick:()=>{ if (VIEW!=='home'){ TAB=t.id; goHome(true); } else setTab(t.id); }},
      h('span',{class:'nav-ic', svg:t.ic}), h('span',{class:'nav-tx'}, t.label)));
  }
  const origRenderBar = renderBar;
  renderBar = function(){
    origRenderBar();
    const brand = BAR.querySelector('.brand');
    if (brand){
      brand.replaceChildren(
        h('span',{class:'logo-mk', 'aria-hidden':'true'}, h('i'),h('i'),h('i'),h('i'),h('i'),h('i')),
        h('span',{class:'logo-tx'}, 'bandsix'));
      brand.classList.add('logo');
    }
    const inRun = VIEW==='run';
    document.body.classList.toggle('in-run', inRun);
    if (!inRun){
      BAR.querySelectorAll('.btn').forEach(b=>{ if (b.textContent==='Startseite') b.remove(); });
      const sp = BAR.querySelector('.spacer');
      const nav = h('nav',{class:'topnav', 'aria-label':'Hauptnavigation'}, navButtons('topnav-btn'));
      if (sp) sp.before(nav); else BAR.append(nav);
      TABBAR.hidden = false; TABBAR.replaceChildren(...navButtons('tab-btn'));
    } else {
      TABBAR.hidden = true;
    }
  };

  /* ---------- helpers ---------- */
  const pct = (c,t) => t ? Math.round(c/t*100) : null;
  function secStats(sec){
    const stats = store.get('stats', {}); let c=0, t=0;
    for (const ty of TYPE_ORDER.filter(x=>TYPES[x].sec===sec)){ const s=stats[ty]; if (s && s.t){ c+=s.c; t+=s.t; } }
    const done = store.get('done', {}); let n=0, d=0;
    for (const ty of TYPE_ORDER.filter(x=>TYPES[x].sec===sec)){ const p=freePool(ty); n+=p.length; d+=p.filter(x=>done[ty+':'+x.id]).length; }
    return {acc: pct(c,t), q:t, done:d, total:n};
  }
  function lastExam(){ const hist = store.get('history', []); return hist.length ? hist[hist.length-1] : null; }
  function greeting(){ const hr=new Date().getHours(); return hr<5?'Gute Nacht':hr<11?'Guten Morgen':hr<18?'Hallo':'Guten Abend'; }
  function testDate(){ const s = store.get('testDate', null); if (!s) return null; const d=new Date(s); return isNaN(d) ? null : d; }
  function ring(p, label, sub){
    const v = p==null ? 0 : Math.max(0,Math.min(100,p));
    return h('div',{class:'ring-lg', style:'--p:'+v}, h('div',{class:'ring-in'}, h('b',null,label), sub? h('small',null,sub):null));
  }
  function sectionTitle(eyebrow, title, sub){
    return h('header',{class:'sec-head'}, eyebrow? h('div',{class:'eyebrow'},eyebrow):null, h('h2',null,title), sub? h('p',{class:'muted'},sub):null);
  }
  function mistakeKeys(){
    const doneM = store.get('done',{});
    return store.get('mistakes', []).filter(k=>{ const [t,id]=k.split(':'); return POOL[t] && byId(t,id) && (!isMock(t,id) || (doneM[k]||{}).mode==='exam'); });
  }

  /* Weakness training without AI: picks unseen (else least recently done) training items of the weak types. */
  function offlineTargeted(){
    const weak = weaknesses().slice(0,3);
    if (!weak.length) return null;
    const done = store.get('done', {}); const units=[]; const used=new Set();
    for (const w of weak){
      const t = w.skill.startsWith('cw-')?'cw': w.skill.startsWith('bas-')?'bas': w.skill.startsWith('lcr-')?'lcr': w.skill.startsWith('r-')?'acad':'ltalk';
      const types = t==='acad' ? ['acad','daily'] : t==='ltalk' ? ['ltalk','lconv','lann'] : [t];
      for (const ty of types){
        const pool = freePool(ty).filter(x=>!used.has(ty+':'+x.id)).sort((a,b)=>((done[ty+':'+a.id]||{}).d||0)-((done[ty+':'+b.id]||{}).d||0));
        const n = ty==='lcr'||ty==='bas' ? 5 : 1;
        pool.slice(0,n).forEach(x=>{ used.add(ty+':'+x.id); units.push({type:ty, id:x.id}); });
      }
    }
    if (!units.length) return null;
    const bySec={}; for (const u of units) (bySec[TYPES[u.type].sec] ||= []).push(u);
    const secs = SECS.filter(k=>bySec[k]).map(k=>({key:k, units:bySec[k]}));
    return {mode:'train', title:'Gezieltes Training', trainType:null, secs, si:0, ui:0, resp:{}, started:Date.now(), id:'w'+Date.now()};
  }
  async function startTargeted(btn){
    if (SAMPLE && !AI_OFF){
      btn.disabled = true; const old = btn.textContent; btn.textContent = 'Erzeuge passende Aufgaben …';
      try { startRun(await targetedSession()); return; } catch(e){ btn.disabled=false; btn.textContent=old; }
    }
    const run = offlineTargeted();
    if (run) startRun(run); else toast('Noch zu wenige Antworten. Übe erst ein paar Aufgaben im Training.');
  }


  /* ---------- plan: free sample tasks, paid mock tests and packs ----------
     Free: every training task we have, a few less in Listening and Writing. Mock tests are paid.
     There is no payment yet: locked content shows what it will cost ("Preis folgt").
     Beta testers unlock everything with a code under "Mehr". This is a client-side gate only;
     real enforcement needs accounts and a server (see functions/README.md). */
  const IC_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const FREE_LIMIT = {lcr:24, lconv:8, lann:4, ltalk:4, bas:6, email:2, disc:2};
  const BETA_CODE = 'BAND6BETA';
  function unlocked(){ try { return localStorage.getItem('bandsix.unlock')==='1'; } catch(e){ return false; } }
  function freeIds(t){
    const pool = trainPool(t); const lim = FREE_LIMIT[t];
    if (unlocked() || lim==null) return new Set(pool.map(x=>x.id));
    let n = 0; const out = new Set();
    for (const x of pool){ if (x.gen) out.add(x.id); else if (n < lim){ out.add(x.id); n++; } }
    return out;
  }
  function freePool(t){ const f = freeIds(t); return trainPool(t).filter(x=>f.has(x.id)); }
  function isFree(t,id){ return freeIds(t).has(id); }
  function freeTotals(){
    const r = {}; let free=0, all=0;
    for (const sk of SECS){ let f=0,a=0; for (const t of TYPE_ORDER.filter(x=>TYPES[x].sec===sk)){ f+=freePool(t).length; a+=trainPool(t).length; } r[sk]={free:f, all:a}; free+=f; all+=a; }
    r.free=free; r.all=all; return r;
  }

  function closePaywall(){ const m=document.getElementById('paywall'); if (m) m.remove(); document.removeEventListener('keydown', escPaywall); }
  function escPaywall(e){ if (e.key==='Escape') closePaywall(); }
  function paywall(reason){
    closePaywall();
    const plan = (name, desc, feats, featured) => h('article',{class:'plan'+(featured?' featured':'')},
      featured ? h('span',{class:'plan-flag'}, 'Beliebt') : null,
      h('h3',null,name), h('p',{class:'small muted'}, desc),
      h('div',{class:'plan-price'}, h('b',null,'Preis folgt'), h('small',null,'einmalig, kein Abo')),
      h('ul',null, feats.map(f=>h('li',null,f))),
      h('button',{class:'btn'+(featured?' primary':''), disabled:true}, 'Bald verfügbar'));
    const m = h('div',{id:'paywall', class:'paywall', role:'dialog', 'aria-modal':'true', 'aria-labelledby':'pw-title', onclick:e=>{ if (e.target.id==='paywall') closePaywall(); }},
      h('div',{class:'paywall-card'},
        h('button',{class:'pw-close', 'aria-label':'Schließen', onclick:closePaywall}, '×'),
        h('div',{class:'eyebrow'}, 'Mehr üben'),
        h('h2',{id:'pw-title'}, reason || 'Diese Aufgabe gehört zu einem Paket.'),
        h('p',{class:'muted'}, 'Die Gratis-Aufgaben bleiben dauerhaft frei. Probetests und zusätzliche Aufgaben kannst du bald für wenig Geld dazukaufen. Bezahlen ist in der Beta noch nicht möglich.'),
        h('div',{class:'plans'},
          plan('Probetest', 'Ein kompletter Test in voller Länge mit Timer und Band-Schätzung.', ['Reading, Listening, Writing, Speaking', 'Auswertung nach Fragetyp', 'Aufgaben, die du noch nicht kennst']),
          plan('Komplettpaket', 'Alle Probetests und alle Aufgaben, auch neue, sobald sie erscheinen.', ['Alle Probetests', 'Alle Übungsaufgaben', 'Neue Aufgabenpakete inklusive'], true),
          plan('Aufgabenpaket', 'Neue Übungsaufgaben für einen Bereich deiner Wahl.', ['Neue Aufgaben je Bereich', 'Mit Lösung und Erklärung', 'Für deine Schwächen'])),
        h('p',{class:'small muted', style:'margin-top:14px'}, 'Du testest Bandsix in der Beta? Gib deinen Beta-Code unter „Mehr“ ein, dann ist alles freigeschaltet.')));
    document.body.append(m); document.addEventListener('keydown', escPaywall);
    const c = m.querySelector('.pw-close'); if (c) c.focus();
  }

  // Gate every run in one place: mock tests need a pack, training runs keep only free tasks.
  const origStartRun = startRun;
  startRun = function(run){
    if (run && run.mode==='exam' && !unlocked()){ paywall('Probetests gibt es als Paket.'); return; }
    if (run && run.mode==='train' && !unlocked()){
      const secs = run.secs.map(s=>({...s, units:s.units.filter(u=>isFree(u.type,u.id))})).filter(s=>s.units.length);
      if (!secs.length){ paywall('Diese Aufgabe gehört zu einem Aufgabenpaket.'); return; }
      run = {...run, secs};
    }
    return origStartRun(run);
  };
  const origBuildTrain = buildTrain;
  buildTrain = function(type, ids){ return origBuildTrain(type, ids || freePool(type).map(x=>x.id)); };


  /* ---------- fairer Listen-and-Repeat scoring ----------
     The browser's speech recognition writes contractions, numbers and compounds its own way
     ("there's" for "there is", "health care" for "healthcare", "OK" for "okay"). Those are not
     speaking mistakes, so both texts are brought into one canonical form before comparing.
     Returns hit[] aligned with the engine's words(ref) so the existing diff display keeps working. */
  const IS_WORDS = new Set(['there','here','it','that','what','where','who','how','when','why','he','she','this','everyone','everything','someone','something','nobody','nothing','one','today','tomorrow','dinner','lunch','class','room','meeting']);
  const NT = {"can't":['can','not'],"cannot":['can','not'],"won't":['will','not'],"shan't":['shall','not'],"ain't":['is','not']};
  const SAME = {okay:'ok', alright:'all right', 'e-mail':'email', till:'until', 'til':'until', gonna:'going to', wanna:'want to', gotta:'got to', percent:'percent', cause:'because', 'cuz':'because'};
  const HOMO = [['to','too','two'],['there','their'],['for','four'],['know','no'],['right','write'],['hear','here'],['weather','whether'],['by','buy','bye'],['its','it'],['your','you'],['would','had'],['is','has'],['a','an','the'],['in','on']];
  const HOMO_MAP = {}; HOMO.forEach((g,i)=>g.forEach(w=>{ (HOMO_MAP[w] ||= new Set()).add(i); }));
  const FILLER = new Set(['uh','um','uhm','er','erm','ah','hmm','mm','mhm']);
  // Display tokens: the sentence as written (case and punctuation kept). Used by the engine's diff view.
  words = function(str){ return String(str||'').trim().split(/\s+/).filter(Boolean); };
  function subTokens(tok){
    return tok.toLowerCase().replace(/([a-z])-(?=[a-z])/g,'$1').replace(/(\d+):(\d+)/g,(m,a,b)=>a+' '+(b==='00'?'':b)).replace(/\d+/g,m=>' '+numWord(m)+' ')
      .replace(/[’‘`]/g,"'").replace(/[^a-z' ]+/g,' ').split(/\s+/).map(w=>w.replace(/^'+|'+$/g,'')).filter(Boolean);
  }
  function canon(tok){
    if (SAME[tok]) return SAME[tok].split(' ');
    if (NT[tok]) return NT[tok].slice();
    let m;
    if ((m = tok.match(/^(.+)n't$/))) return [m[1], 'not'];
    if ((m = tok.match(/^(.+)'re$/))) return [m[1], 'are'];
    if ((m = tok.match(/^(.+)'ve$/))) return [m[1], 'have'];
    if ((m = tok.match(/^(.+)'ll$/))) return [m[1], 'will'];
    if ((m = tok.match(/^(.+)'d$/))) return [m[1], 'would'];
    if ((m = tok.match(/^(.+)'m$/))) return [m[1], 'am'];
    if ((m = tok.match(/^(.+)'s$/))){ if (m[1]==='let') return ['let','us']; return IS_WORDS.has(m[1]) ? [m[1], 'is'] : [m[1]+'s']; }
    return [tok.replace(/'/g,'')];
  }
  // Rough phonetic key (Metaphone-like): words that sound alike get the same key.
  function phon(w){
    let x = w.toLowerCase().replace(/[^a-z]/g,'');
    if (!x) return '';
    x = x.replace(/^kn|^gn|^pn|^wr/, m=>m[1]).replace(/^x/,'s').replace(/^wh/,'w')
      .replace(/(.)\1+/g,'$1')
      .replace(/tch/g,'ch').replace(/t?ion\b|sion/g,'xn').replace(/dg(?=[eiy])/g,'j')
      .replace(/ph/g,'f').replace(/gh(?![aeiou])/g,'').replace(/ck/g,'k').replace(/c(?=[eiy])/g,'s').replace(/c/g,'k')
      .replace(/q/g,'k').replace(/x/g,'ks').replace(/z/g,'s').replace(/sh/g,'x').replace(/th/g,'0').replace(/ch/g,'x')
      .replace(/v/g,'f').replace(/y(?![aeiou])/g,'');
    const head = x[0]; const tail = x.slice(1).replace(/[aeiouyhw]/g,'');
    return (/[aeiou]/.test(head) ? 'a' : head) + tail;
  }
  function lev(a,b){
    if (a===b) return 0; const m=a.length, n=b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({length:n+1},(_,j)=>j);
    for (let i=1;i<=m;i++){ const cur=[i]; for (let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; }
    return prev[n];
  }
  const PHON = new Map(); const ph = w => { let k=PHON.get(w); if (k==null){ k=phon(w); PHON.set(w,k); } return k; };
  /* How well a heard word matches the expected one, from 0 to 1. Generic rules instead of single cases:
     same word, a known homophone, the same sound written differently, or a near spelling. */
  function softEq(a,b){
    if (a===b) return 1;
    const ga = HOMO_MAP[a], gb = HOMO_MAP[b];
    if (ga && gb){ for (const g of ga) if (gb.has(g)) return 1; }
    if (a.length<2 || b.length<2) return 0;
    const pa = ph(a), pb = ph(b);
    // sounds the same: the recogniser only chose another spelling
    if (pa && pa===pb && Math.abs(a.length-b.length)<=2) return 1;
    // plural or 3rd-person "s" heard or dropped
    if (a.length>3 && b.length>3 && (a===b+'s' || b===a+'s' || a===b+'es' || b===a+'es')) return 0.75;
    const L = Math.max(a.length,b.length);
    if (L>=4 && lev(a,b)/L <= 0.2) return 0.75;               // near spelling
    if (L>=5 && pa && pb && lev(pa,pb)<=1 && lev(a,b)/L <= 0.34) return 0.5; // close in sound
    return 0;
  }
  function splitCompounds(hyp, refSet){
    const out = [];
    for (const w of hyp){
      if (refSet.has(w) || w.length<6){ out.push(w); continue; }
      let done = false;
      for (let k=3;k<=w.length-3 && !done;k++){ const a=w.slice(0,k), b=w.slice(k); if (refSet.has(a) && refSet.has(b)){ out.push(a,b); done=true; } }
      if (!done) out.push(w);
    }
    return out;
  }
  repeatScore = function(ref, said){
    const refTok = words(ref);
    const R = []; refTok.forEach((t,i)=>subTokens(t).forEach(st=>canon(st).forEach(c=>R.push({c, i}))));
    // join compounds the recogniser split apart ("health care" -> healthcare) by also offering the reverse split
    const refSet = new Set(R.map(x=>x.c));
    let H = [];
    words(said).forEach(t=>subTokens(t).forEach(st=>canon(st).forEach(c=>{ if (!FILLER.has(c)) H.push(c); })));
    if (!H.length) return {score:0, acc:0, hit:new Array(refTok.length).fill(false)};
    H = splitCompounds(H, refSet);
    // merge two heard words if together they form one reference word
    const merged = []; for (let j=0;j<H.length;j++){ if (j+1<H.length && !refSet.has(H[j]) && refSet.has(H[j]+H[j+1])){ merged.push(H[j]+H[j+1]); j++; } else merged.push(H[j]); }
    H = merged;
    const n=R.length, m=H.length;
    const d = Array.from({length:n+1},()=>new Float64Array(m+1));
    for (let i=n-1;i>=0;i--) for (let j=m-1;j>=0;j--){ const e=softEq(R[i].c,H[j]); d[i][j] = Math.max(d[i+1][j], d[i][j+1], e ? d[i+1][j+1]+e : 0); }
    const got = new Array(n).fill(0); let i=0, j=0, used=0;
    while (i<n && j<m){ const e=softEq(R[i].c,H[j]); if (e && Math.abs(d[i][j]-(d[i+1][j+1]+e))<1e-9){ got[i]=e; i++; j++; used++; } else if (d[i+1][j]>=d[i][j+1]) i++; else j++; }
    // words said in a different place still count half (meaning kept, order changed)
    const usedH = new Array(m).fill(false);
    { let i2=0, j2=0; while (i2<n && j2<m){ const e=softEq(R[i2].c,H[j2]); if (e && Math.abs(d[i2][j2]-(d[i2+1][j2+1]+e))<1e-9){ usedH[j2]=true; i2++; j2++; } else if (d[i2+1][j2]>=d[i2][j2+1]) i2++; else j2++; } }
    for (let k=0;k<n;k++){ if (got[k]) continue; const j3 = H.findIndex((w,jj)=>!usedH[jj] && softEq(R[k].c,w)>=0.75); if (j3>=0){ got[k]=0.5; usedH[j3]=true; used++; } }
    const matched = got.reduce((a,b)=>a+b,0);
    const extra = Math.max(0, m - used);
    const acc = Math.max(0, Math.min(1, (matched - extra*0.25)/n));
    const perfect = got.every(x=>x>=1) && extra===0;
    const score = perfect ? 5 : acc>=0.85 ? 4 : acc>=0.65 ? 3 : acc>=0.4 ? 2 : acc>0 ? 1 : 0;
    // a reference word counts as hit when all of its canonical parts were heard
    const hit = refTok.map((_,k)=>{ const parts = R.map((x,idx)=>x.i===k?idx:-1).filter(x=>x>=0); return parts.every(p=>got[p]>0); });
    return {score, acc, hit};
  };

  // Tell the speech recogniser which sentence is expected, so it can prefer the matching alternative.
  const origPlay = play;
  play = function(lines){
    try {
      const u = (VIEW==='run' && RUN) ? curUnit() : null;
      window.bandsixDictHint = u && u.type==='repeat' ? (lines||[]).map(l=>l.text).join(' ') : null;
    } catch(e){ window.bandsixDictHint = null; }
    return origPlay.apply(this, arguments);
  };

  /* ---------- views ---------- */
  function viewStart(){
    const out = [];
    const ex = lastExam();
    const td = testDate();
    const band = ex && ex.overall!=null ? ex.overall.toFixed(1) : '–';
    // hero
    let countdown;
    if (td){
      const ms = td - Date.now(); const days = Math.max(0, Math.ceil(ms/864e5));
      countdown = h('div',{class:'hero-count'},
        h('div',{class:'eyebrow'}, 'Testtermin'),
        h('div',{class:'big'}, ms>0 ? days : '🎯', ms>0 ? h('small',null, days===1?' Tag':' Tage') : null),
        h('div',{class:'small'}, td.toLocaleDateString('de-DE',{weekday:'short', day:'numeric', month:'long', year:'numeric'})),
        h('button',{class:'link-btn', onclick:()=>{ store.set('testDate', null); renderHome(); }}, 'Termin ändern'));
    } else {
      const inp = h('input',{type:'date', class:'date-in', 'aria-label':'Datum deines Tests', min:new Date().toISOString().slice(0,10)});
      countdown = h('div',{class:'hero-count'},
        h('div',{class:'eyebrow'}, 'Testtermin'),
        h('p',{class:'small'}, 'Trag dein Datum ein, dann zählt Bandsix für dich herunter.'),
        h('div',{class:'row'}, inp, h('button',{class:'btn small', onclick:()=>{ if (!inp.value) return toast('Bitte ein Datum wählen.'); store.set('testDate', inp.value+'T09:00'); renderHome(); }}, 'Speichern')));
    }
    out.push(h('section',{class:'dash-hero'},
      h('div',{class:'aurora', 'aria-hidden':'true'}, h('b'),h('b'),h('b')),
      h('div',{class:'dash-hero-main'},
        h('div',{class:'eyebrow'}, greeting()),
        h('h1',null, ex ? 'Weiter Richtung Band 6.' : unlocked() ? 'Bereit für deinen ersten Probetest?' : 'Trainiere jeden Aufgabentyp. Kostenlos.'),
        h('p',{class:'lead'}, ex ? `Dein letzter Probetest: ${ex.title}. Trainiere jetzt gezielt die Aufgabentypen, die dich am meisten kosten.` : unlocked() ? 'Ein kompletter Probetest zeigt dir in 85 Minuten, wo du stehst. Danach trainierst du gezielt deine Schwächen.' : `${freeTotals().free} Gratis-Aufgaben aus allen vier Teilen, mit Lösung und Erklärung auf Deutsch. Wenn du bereit bist, misst du dich in einem Probetest in voller Länge.`),
        h('div',{class:'row'},
          unlocked()
            ? h('button',{class:'btn primary lg', onclick:()=>{ const m = MOCKS.find(m=>!store.get('history',[]).some(x=>x.title && x.title.includes(m.name))) || MOCKS[0]; startRun(buildMock(m)); }}, ex ? 'Nächsten Probetest starten' : 'Probetest starten')
            : h('button',{class:'btn primary lg', onclick:()=>setTab('training')}, 'Kostenlos üben'),
          unlocked()
            ? h('button',{class:'btn glass lg', onclick:()=>setTab('training')}, 'Zum Training')
            : h('button',{class:'btn glass lg', onclick:()=>setTab('tests')}, 'Probetests ansehen'))),
      h('div',{class:'dash-hero-side'},
        h('div',{class:'hero-band'}, h('div',{class:'eyebrow'}, 'Geschätztes Band'), h('div',{class:'big'}, band), h('div',{class:'small'}, ex && ex.overall!=null ? '≈ '+CONC[ex.overall]+' von 120' : 'nach deinem ersten Probetest')),
        countdown)));

    // resume
    const saved = store.get('run', null);
    if (saved && saved.secs){
      const s0 = saved.secs[saved.si];
      out.push(h('div',{class:'resume'},
        h('div',{class:'resume-ic', svg:IC.play}),
        h('div',{style:'flex:1;min-width:180px'}, h('b',null,'Weitermachen: '+saved.title), h('div',{class:'small muted'}, SEC[s0.key].name+', Teil '+(saved.ui+1)+' von '+s0.units.length+(saved.secLeft!=null? ' · Restzeit '+fmt(saved.secLeft):''))),
        h('div',{class:'row'}, h('button',{class:'btn primary', onclick:()=>resumeRun()},'Fortsetzen'), h('button',{class:'btn ghost', onclick:()=>{ store.set('run',null); renderHome(); }},'Verwerfen'))));
    }

    // recommendations
    const mist = mistakeKeys(); const weak = weaknesses();
    const recs = [];
    if (weak.length){
      const b = h('button',{class:'btn primary small', onclick:()=>startTargeted(b)}, 'Gezielt üben');
      recs.push(h('article',{class:'rec'}, h('div',{class:'rec-tag bad'}, 'Schwäche'), h('h3',null, SKILL_DE[weak[0].skill]||weak[0].skill), h('p',{class:'muted small'}, Math.round(weak[0].acc*100)+' % richtig bei den letzten Antworten. Bandsix stellt dir passende Aufgaben zusammen.'), b));
    }
    if (mist.length) recs.push(h('article',{class:'rec'}, h('div',{class:'rec-tag warn'}, 'Fehlerheft'), h('h3',null, mist.length+' Aufgaben zum Wiederholen'), h('p',{class:'muted small'}, 'Sie verschwinden, sobald du sie besser löst.'), h('button',{class:'btn small', onclick:()=>startRun(buildMistakeRun())}, 'Fehler wiederholen')));
    const done = store.get('done', {});
    const nextType = TYPE_ORDER.map(t=>({t, open: freePool(t).filter(x=>!done[t+':'+x.id]).length, n: freePool(t).length})).filter(x=>x.open>0).sort((a,b)=>(b.open/b.n)-(a.open/a.n))[0];
    if (nextType) recs.push(h('article',{class:'rec'}, h('div',{class:'rec-tag'}, SEC[TYPES[nextType.t].sec].name), h('h3',null, TYPES[nextType.t].name), h('p',{class:'muted small'}, nextType.open+' von '+nextType.n+' Aufgaben noch offen.'), h('button',{class:'btn small', onclick:()=>startRun(buildTrain(nextType.t))}, 'Jetzt üben')));
    if (recs.length){ out.push(sectionTitle('Heute', 'Empfohlen für dich')); out.push(h('div',{class:'recs'}, recs)); }

    // section tiles
    out.push(sectionTitle('Überblick', 'Deine vier Teile'));
    out.push(h('div',{class:'sec-tiles'}, SECS.map(sk=>{
      const s = secStats(sk);
      return h('button',{class:'stile sec-'+sk, onclick:()=>{ setTrainSec(sk); setTab('training'); }},
        h('div',{class:'stile-top'}, h('span',{class:'stile-ic', svg:SEC[sk].ic}), h('span',{class:'stile-name'}, SEC[sk].name)),
        ring(s.acc, s.acc==null?'–':s.acc+'%', s.q? s.q+' Fragen':'noch offen'),
        h('div',{class:'stile-foot'}, h('div',{class:'meter'}, h('i',{style:'width:'+(s.total? s.done/s.total*100:0)+'%'})), h('span',{class:'small muted'}, s.done+' / '+s.total+' Aufgaben')));
    })));
    return out;
  }

  function viewTests(){
    const out = [sectionTitle('Probetests', 'Unter echten Bedingungen', 'Reading 50 Fragen · Listening 47 · Writing 12 · Speaking 11. Timer nach offiziellen Vorgaben, Audio nur einmal, Auswertung am Ende. Diese Aufgaben kommen im Training nicht vor.')];
    const open = unlocked();
    if (!open) out.push(h('div',{class:'offer'},
      h('div',null, h('div',{class:'eyebrow'}, 'Pakete'), h('h3',null,'Probetests gibt es als Paket.'), h('p',{class:'muted'}, 'Ein Probetest misst dich in voller Länge, mit Timer und Band-Schätzung am Ende. Das Training bleibt kostenlos. Bezahlen ist in der Beta noch nicht möglich, der Preis folgt.')),
      h('button',{class:'btn primary', onclick:()=>paywall('Probetests gibt es als Paket.')}, 'Pakete ansehen')));
    const hist = store.get('history', []);
    out.push(h('div',{class:'mock-grid'}, MOCKS.map((m,i)=>{
      const last = hist.slice().reverse().find(x=>x.title && x.title.includes(m.name));
      const kn = knownInMock(m);
      return h('article',{class:'mock'},
        h('div',{class:'mock-art', 'aria-hidden':'true'}, h('span',null, m.id)),
        h('div',{class:'mock-body'},
          h('div',{class:'row', style:'justify-content:space-between'}, h('h3',null,m.name), h('span',{class:'row', style:'gap:6px'}, open ? null : h('span',{class:'pill lock'}, h('span',{svg:IC_LOCK}), 'Paket'), h('span',{class:'pill'}, 'ca. 85 Min'))),
          last && last.overall!=null ? h('p',{class:'small'}, 'Zuletzt: ', h('b',null,'Band '+last.overall.toFixed(1)), h('span',{class:'muted'}, ' · '+new Date(last.date).toLocaleDateString('de-DE'))) : h('p',{class:'small muted'}, 'Noch nicht gemacht.'),
          kn.length ? h('p',{class:'small', style:'color:var(--warn)'}, kn.length+' Aufgaben kennst du schon aus früheren Übungen.') : h('p',{class:'small', style:'color:var(--good)'}, 'Alle Aufgaben sind für dich neu.'),
          open ? h('button',{class:'btn primary', onclick:()=>startRun(buildMock(m))}, 'Kompletten Test starten')
               : h('button',{class:'btn primary', onclick:()=>paywall(m.name+' freischalten')}, h('span',{class:'btn-ic', svg:IC_LOCK}), 'Freischalten · Preis folgt'),
          open ? h('div',{class:'mock-parts'}, SECS.map(k=>h('button',{class:'chip-btn sec-'+k, onclick:()=>startRun(buildMock(m,k))}, h('span',{svg:SEC[k].ic}), SEC[k].name)))
               : h('div',{class:'mock-parts'}, SECS.map(k=>h('span',{class:'chip-btn sec-'+k, style:'cursor:default'}, h('span',{svg:SEC[k].ic}), SEC[k].name)))));
    })));
    out.push(h('div',{class:'callout'}, h('b',null,'Tipp: '), 'Plane für einen kompletten Test 85 Minuten ohne Unterbrechung ein und nutze Kopfhörer. Du kannst jederzeit ins Hauptmenü und später fortsetzen.'));
    return out;
  }

  /* What each part looks like in the real test and what each task type trains. */
  const SEC_INFO = {
    reading: {exam:'50 Fragen · ca. 27–30 Min · adaptiv',
      text:'Reading beginnt mit einem Startblock. Je nachdem, wie gut du dort bist, folgt ein leichterer oder schwererer zweiter Block. Den größten Anteil hat Complete the Words mit rund 30 Lücken, dazu kommen kurze Alltagstexte und ein akademischer Text.',
      tip:'Complete the Words zuerst zügig lösen: Dort holst du die meisten Punkte pro Minute. Bei langen Texten nicht festbeißen.'},
    listening: {exam:'47 Fragen · ca. 18–29 Min · adaptiv',
      text:'Auch Listening passt sich deinem Niveau an. Du hörst jede Aufnahme nur einmal, mit Akzenten aus den USA, Großbritannien und Australien. Die meisten Fragen sind kurze Reaktionen (Choose a Response), dazu kommen Gespräche, Durchsagen und Ausschnitte aus Vorlesungen.',
      tip:'Kein Zurückspulen: Notiere zwei, drei Stichworte und achte auf Signalwörter wie but, actually oder instead.'},
    writing: {exam:'12 Aufgaben · 23 Min',
      text:'Zuerst baust du zehn Sätze aus Wortgruppen (Build a Sentence). Danach schreibst du eine E-Mail in 7 Minuten und einen Beitrag zu einer Online-Diskussion in 10 Minuten. E-Mail und Diskussion werden je mit 0 bis 5 bewertet.',
      tip:'E-Mail: alle drei Punkte abhaken. Diskussion: klare Position, Bezug auf einen Beitrag, neues Argument mit Beispiel.'},
    speaking: {exam:'11 Aufgaben · ca. 8 Min',
      text:'Du sprichst sieben Sätze nach, die immer länger werden, und beantwortest vier Interviewfragen mit je 45 Sekunden Sprechzeit und ohne Vorbereitungszeit. Jede Antwort wird mit 0 bis 5 bewertet.',
      tip:'Bei Listen and Repeat zählt Vollständigkeit. Im Interview sofort anfangen und die 45 Sekunden nutzen.'}
  };
  const TRAINS = {
    cw:'Wortschatz, Rechtschreibung und Grammatik im Zusammenhang. Du erkennst aus dem Kontext, welches Wort passt, und schreibst es korrekt zu Ende.',
    daily:'Schnelles, gezieltes Lesen: den Zweck eines Textes erkennen, Details finden und zwischen den Zeilen lesen.',
    acad:'Akademisches Lesen: Hauptidee, Details, Schlussfolgerungen, Wortbedeutung im Kontext und warum der Autor etwas erwähnt.',
    lcr:'Natürlich reagieren: Du verstehst Absicht und Tonfall eines Satzes, auch wenn die passende Antwort indirekt ist.',
    lconv:'Gesprächen folgen: Problem, Lösung und nächster Schritt, auch bei Umgangssprache und schnellem Tempo.',
    lann:'Durchsagen verstehen: Zweck und wichtige Details wie Zeiten, Orte und Änderungen.',
    ltalk:'Vorlesungen folgen: Hauptthema, Aufbau, Beispiele und die Haltung des Sprechers erkennen.',
    bas:'Satzbau: Wortstellung, Fragen und Nebensätze sicher bilden, und die Wortgruppe erkennen, die nicht passt.',
    email:'Zielgerichtet schreiben: alle Punkte abdecken, den passenden Ton treffen und unter Zeitdruck klar gliedern.',
    disc:'Argumentieren: eine klare Position beziehen, auf andere Beiträge eingehen und ein eigenes Argument mit Beispiel bringen.',
    repeat:'Genau hinhören und behalten: Du gibst immer längere Sätze vollständig und mit richtiger Satzmelodie wieder.',
    interview:'Spontan und flüssig sprechen: sofort beginnen, die Antwort gliedern und die Sprechzeit füllen.'
  };

  /* Official scoring information from ETS (TOEFL iBT 2026 Test Specifications and Test Overview),
     paraphrased in German. Only what ETS states; nothing invented where ETS says nothing. */
  const ETS_SEC = {
    reading: {points:['Jede richtige Antwort zählt 1 Punkt, es gibt keine Teilpunkte.','Adaptiv in zwei Stufen: Dein Ergebnis im ersten Teil entscheidet, ob der zweite Teil leichter oder schwerer wird. Für ein hohes Band musst du in den schwereren Teil kommen.','Das Ergebnis wird als Band von 1 bis 6 in halben Schritten gemeldet.'],
      none:'Weitere offizielle Kriterien, etwa ob Rechtschreibfehler bei Complete the Words Teilpunkte geben oder ab wie vielen Punkten welches Band erreicht wird, veröffentlicht ETS nicht.'},
    listening: {points:['Jede richtige Antwort zählt 1 Punkt, es gibt keine Teilpunkte.','Adaptiv in zwei Stufen wie Reading: Der erste Teil entscheidet über die Schwierigkeit des zweiten.','Du hörst jede Aufnahme nur einmal.'],
      none:'Weitere offizielle Bewertungskriterien gibt es für Listening nicht.'},
    writing: {points:['Build a Sentence: 1 Punkt pro richtig gebautem Satz.','Write an Email und Academic Discussion: je 0 bis 5 Punkte nach einem offiziellen Raster, bewertet automatisch per KI (Sprachverarbeitung und maschinelles Lernen).','Für die 5 verlangt ETS: Aufgabe voll erfüllt, klar und wirksam formuliert, gut ausgeführt, abwechslungsreicher Satzbau, präzise Wortwahl und fast keine Fehler außer den üblichen Flüchtigkeitsfehlern unter Zeitdruck.'],
      none:null},
    speaking: {points:['Jede der 11 Antworten bekommt 0 bis 5 Punkte, bewertet automatisch per KI.','Listen and Repeat: Für die 5 musst du den Satz exakt und vollständig verständlich wiederholen.','Take an Interview: Für die 5 beantwortest du die Frage vollständig, klar und flüssig. Kurze Pausen und Füllwörter wie „um“ sind normal, solange sie das Verständnis nicht stören.'],
      none:'Konkrete Zahlen, etwa ein Mindest-Sprechtempo oder Grenzwerte für die Aussprache, nennt ETS nicht.'}
  };
  const ETS_TYPE = {
    cw:'ETS misst Rechtschreibung und Wortformen: Du ergänzt vorhersehbare Lücken korrekt. 1 Punkt pro Lücke.',
    daily:'ETS misst, ob du Alltagstexte, Listen und Tabellen sowie knappe Notizsprache verstehst. 1 Punkt pro Frage.',
    acad:'ETS misst Hauptidee, Details, Schlussfolgerungen, Wortbedeutung im Kontext und Textaufbau. Vorwissen ist nicht nötig. 1 Punkt pro Frage.',
    lcr:'ETS misst, ob du die wörtliche und die gemeinte Bedeutung verstehst. 1 Punkt pro Frage.',
    lconv:'ETS misst Hauptidee, Details, Schlussfolgerungen, Absicht der Sprecher und was als Nächstes passiert. 1 Punkt pro Frage.',
    lann:'ETS misst Hauptidee, Details und ob du vorhersagen kannst, was die Zuhörer tun sollen. 1 Punkt pro Frage.',
    ltalk:'ETS misst Haupt- und Nebenideen, Schlussfolgerungen und den Aufbau des Vortrags. 1 Punkt pro Frage.',
    bas:'ETS misst, ob du Satzstrukturen sicher beherrschst. 1 Punkt pro Satz, ein offizielles Raster gibt es nicht.',
    email:'0 bis 5 Punkte. Für eine hohe Note verlangt ETS: Das Ziel der E-Mail wird erreicht und die Höflichkeitsregeln stimmen, der Text ist ausreichend ausgeführt, klar und zusammenhängend, Grammatik und Wortschatz sind vielfältig und korrekt, Rechtschreibung, Zeichensetzung und Großschreibung stimmen.',
    disc:'0 bis 5 Punkte. Für eine hohe Note verlangt ETS: eine klare Position mit gut ausgeführtem Argument, Bezug auf die anderen Beiträge, ausreichend begründet, klar und zusammenhängend, korrekte und vielfältige Sprache. Laut ETS hat eine wirksame Antwort mindestens 100 Wörter.',
    repeat:'0 bis 5 Punkte pro Satz. ETS bewertet, wie genau du wiederholst und wie verständlich du sprichst. Die 5 gibt es nur für eine exakte Wiederholung. Wer nur die Bedeutung trifft, bekommt weniger.',
    interview:'0 bis 5 Punkte pro Frage. ETS bewertet: passende, zusammenhängende Ausführung, ein gutes Gesprächstempo, verständliche Aussprache mit natürlichem Rhythmus und natürlicher Satzmelodie, vielfältiger und korrekter Wortschatz und Satzbau.'
  };
  function etsPanel(sk){
    const E = ETS_SEC[sk];
    return h('details',{class:'ets-panel'},
      h('summary',null, h('span',{class:'ets-badge'}, 'ETS'), h('span',null, 'So bewertet ETS '+SEC[sk].name), h('span',{class:'ets-more muted small'}, 'offizielle Kriterien')),
      h('div',{class:'ets-body'},
        h('ul',null, E.points.map(x=>h('li',null,x))),
        E.none ? h('p',{class:'small muted'}, E.none) : null,
        h('p',{class:'small muted'}, 'Quelle: ETS, TOEFL iBT Test Specifications und Test Overview für das Format ab 2026, sinngemäß übersetzt. Das Gesamtband ist der Durchschnitt der vier Teil-Bänder.')));
  }
  let TRAIN_SEC = 'all';
  try { const v = sessionStorage.getItem('bandsix.trainsec'); if (v==='all' || SECS.includes(v)) TRAIN_SEC = v; } catch(e){}
  function setTrainSec(v){ TRAIN_SEC = v; try { sessionStorage.setItem('bandsix.trainsec', v); } catch(e){} }

  function typeCard(t){
    const T=TYPES[t], sk=T.sec; const done = store.get('done', {}); const st = store.get('stats', {})[t];
    const all = trainPool(t); const free = freePool(t); const nDone = free.filter(x=>done[t+':'+x.id]).length;
    const locked = all.length - free.length;
    const canGen = GEN[t] && SAMPLE && !AI_OFF;
    const genBtn = canGen ? h('button',{class:'btn small ghost', title:'Neue Aufgaben von der KI schreiben lassen', onclick:async()=>{ genBtn.disabled=true; genBtn.textContent='Erzeuge …'; try{ const ids=await generate(t); toast(ids.length+' neue KI-Aufgaben erstellt'); startRun(buildTrain(t, ids)); }catch(e){ genBtn.disabled=false; genBtn.textContent='+ Neue (KI)'; toast('Erzeugen hat nicht geklappt, bitte nochmal versuchen.'); } }}, '+ Neue (KI)') : null;
    return h('article',{class:'tcard tcard-xl sec-'+sk},
      h('div',{class:'tcard-head'}, h('span',{class:'tcard-ic', svg:SEC[sk].ic}),
        h('span',{class:'row', style:'gap:6px'},
          st && st.t ? h('span',{class:'pill '+(st.c/st.t>=.85?'good':st.c/st.t>=.7?'warn':'bad')}, Math.round(st.c/st.t*100)+' %') : null,
          h('span',{class:'pill free'}, free.length+' gratis'))),
      h('h3',null, T.name),
      h('div',{class:'tcard-txt'},
        h('div',null, h('b',null,'So läuft es'), h('p',null, T.de)),
        h('div',null, h('b',null,'Das trainierst du'), h('p',null, TRAINS[t]||'')),
        ETS_TYPE[t] ? h('div',{class:'tcard-ets'}, h('b',null,'Offizielle Bewertung (ETS)'), h('p',null, ETS_TYPE[t])) : null),
      h('div',{class:'tcard-foot'},
        h('div',{class:'meter'}, h('i',{style:'width:'+(free.length? nDone/free.length*100:0)+'%'})),
        h('span',{class:'small muted'}, nDone+' / '+free.length+' erledigt')),
      locked ? h('button',{class:'lock-note', onclick:()=>paywall('Mehr Aufgaben für '+T.name)}, h('span',{svg:IC_LOCK}), (locked===1?'1 weitere Aufgabe im Paket':locked+' weitere Aufgaben im Paket')) : null,
      h('div',{class:'row'}, h('button',{class:'btn small primary', onclick:()=>startRun(buildTrain(t))}, 'Üben'), h('button',{class:'btn small', onclick:()=>renderType(t)}, 'Aufgaben'), genBtn));
  }

  function viewTraining(){
    const out = [sectionTitle('Training', 'Nach Aufgabentyp üben', 'Ohne Zeitdruck. Nach jeder Aufgabe siehst du die Lösung mit Erklärung auf Deutsch, beim Hören auch das Transkript.')];
    const seg = (v,label) => h('button',{class:'seg-btn'+(TRAIN_SEC===v?' on':'')+(v!=='all'?' sec-'+v:''), 'aria-pressed':String(TRAIN_SEC===v), onclick:()=>{ setTrainSec(v); renderHome(); window.scrollTo({top:0}); }}, v!=='all'? h('span',{class:'seg-dot'}):null, label);
    out.push(h('div',{class:'train-nav'}, h('div',{class:'seg seg-lg'}, seg('all','Alle Bereiche'), SECS.map(k=>seg(k, SEC[k].name)))));
    if (TRAIN_SEC==='all'){
      const mist = mistakeKeys(); const weak = weaknesses();
      const top = h('div',{class:'train-top'});
      if (mist.length) top.append(h('div',{class:'mini-card'}, h('div',null, h('b',null,'Fehlerheft'), h('div',{class:'small muted'}, mist.length+' Aufgaben zum Wiederholen')), h('button',{class:'btn small primary', onclick:()=>startRun(buildMistakeRun())}, 'Wiederholen')));
      if (weak.length){ const b=h('button',{class:'btn small', onclick:()=>startTargeted(b)}, 'Starten'); top.append(h('div',{class:'mini-card'}, h('div',null, h('b',null,'Schwächen gezielt trainieren'), h('div',{class:'small muted'}, weak.slice(0,3).map(w=>SKILL_DE[w.skill]||w.skill).join(' · '))), b)); }
      if (top.childElementCount) out.push(top);
    }
    const secs = TRAIN_SEC==='all' ? SECS : [TRAIN_SEC];
    for (const sk of secs){
      const I = SEC_INFO[sk]; const types = TYPE_ORDER.filter(t=>TYPES[t].sec===sk);
      out.push(h('section',{class:'tsec sec-'+sk, id:'sec-'+sk},
        h('div',{class:'tsec-hero'},
          h('div',{class:'aurora', 'aria-hidden':'true'}, h('b'),h('b'),h('b')),
          h('div',{class:'tsec-main'},
            h('div',{class:'stage-kicker'}, h('span',{class:'stage-dot'}), SEC[sk].de+' · '+types.length+' Aufgabentypen'),
            h('h2',null, SEC[sk].name),
            h('p',{class:'stage-sub'}, I.text)),
          h('div',{class:'tsec-side'},
            h('div',{class:'tsec-fact'}, h('small',null,'In der Prüfung'), h('b',null, I.exam)),
            h('div',{class:'tsec-fact'}, h('small',null,'Tipp'), h('span',null, I.tip)))),
        etsPanel(sk),
        h('div',{class:'type-grid type-grid-xl'}, types.map(typeCard))));
    }
    if (TRAIN_SEC!=='all'){
      const i = SECS.indexOf(TRAIN_SEC); const nx = SECS[(i+1)%SECS.length];
      out.push(h('div',{class:'row', style:'justify-content:space-between;margin-top:28px'},
        h('button',{class:'btn ghost', onclick:()=>{ setTrainSec('all'); renderHome(); window.scrollTo({top:0}); }}, 'Alle Bereiche anzeigen'),
        h('button',{class:'btn', onclick:()=>{ setTrainSec(nx); renderHome(); window.scrollTo({top:0}); }}, 'Weiter zu '+SEC[nx].name+' →')));
    }
    return out;
  }

  function viewProgress(){
    const out = [sectionTitle('Fortschritt', 'Wo du Punkte verlierst', 'Gezählt werden Probetests und Trainingsaufgaben, bei denen du „Antwort prüfen“ geklickt hast.')];
    out.push(progressPanel());
    const hist = store.get('history', []);
    if (hist.length){
      out.push(sectionTitle(null, 'Verlauf der Probetests'));
      out.push(h('div',{class:'panel tbl-wrap'}, h('table',null,
        h('thead',null,h('tr',null,['Datum','Test','R','L','W','S','Gesamt','≈ 0–120'].map(x=>h('th',null,x)))),
        h('tbody',null, hist.slice().reverse().map(r=>h('tr',null,
          h('td',null,new Date(r.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+new Date(r.date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})),
          h('td',null,r.title), SECS.map(k=>h('td',null, r.b[k]!=null? r.b[k].toFixed(1):'–')),
          h('td',null,h('b',null, r.overall!=null? r.overall.toFixed(1):'–')), h('td',null, r.overall!=null? CONC[r.overall]:'–')))))));
    }
    return out;
  }

  function exportData(){
    const data = {app:'bandsix', version:1, exported:new Date().toISOString(), keys:{}};
    for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if (k && k.startsWith('toefl.')) data.keys[k]=localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const a = h('a',{href:URL.createObjectURL(blob), download:'bandsix-fortschritt-'+new Date().toISOString().slice(0,10)+'.json'});
    document.body.append(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Datei gespeichert. Auf dem anderen Gerät unter „Mehr“ einlesen.');
  }
  function importData(file){
    const rd = new FileReader();
    rd.onload = () => {
      try{
        const data = JSON.parse(String(rd.result));
        if (!data || data.app!=='bandsix' || typeof data.keys!=='object') throw 0;
        const keys = Object.keys(data.keys).filter(k=>k.startsWith('toefl.') && typeof data.keys[k]==='string');
        for (let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if (k && k.startsWith('toefl.')) localStorage.removeItem(k); }
        for (const k of keys) localStorage.setItem(k, data.keys[k]);
        toast('Fortschritt eingelesen.'); setTimeout(()=>location.reload(), 600);
      }catch(e){ toast('Diese Datei ist keine Bandsix-Sicherung.'); }
    };
    rd.readAsText(file);
  }

  function viewMore(){
    const out = [sectionTitle('Mehr', 'Einstellungen und Infos')];
    let cur = 'dark'; try { cur = localStorage.getItem('bandsix.theme') || 'dark'; } catch(e){}
    const themeBtn = (val, label) => h('button',{class:'seg-btn'+(cur===val?' on':''), 'aria-pressed':String(cur===val), onclick:()=>{ try{ localStorage.setItem('bandsix.theme', val); }catch(e){} window.dispatchEvent(new Event('bandsix:theme')); renderHome(); }}, label);
    out.push(sectionTitle(null, 'Darstellung'));
    out.push(h('div',{class:'panel row'}, h('div',{class:'seg'}, themeBtn('dark','Dunkel'), themeBtn('light','Hell')), h('span',{class:'small muted'}, 'Gilt nur für diesen Browser.')));
    out.push(sectionTitle(null, 'Beta-Zugang', unlocked() ? 'Alles ist freigeschaltet: Probetests und alle Aufgaben.' : 'Mit einem Beta-Code schaltest du Probetests und alle Aufgaben frei.'));
    if (unlocked()) out.push(h('div',{class:'panel row'}, h('span',{class:'pill good'}, 'Freigeschaltet'), h('span',{style:'flex:1'}), h('button',{class:'btn ghost', onclick:()=>{ try{ localStorage.removeItem('bandsix.unlock'); }catch(e){} renderHome(); }}, 'Gratis-Ansicht testen')));
    else {
      const ci = h('input',{type:'text', class:'date-in', placeholder:'Beta-Code', 'aria-label':'Beta-Code', autocomplete:'off', autocapitalize:'characters'});
      const go = () => { if (ci.value.trim().toUpperCase()===BETA_CODE){ try{ localStorage.setItem('bandsix.unlock','1'); }catch(e){} toast('Alles freigeschaltet.'); renderHome(); } else toast('Dieser Code passt nicht.'); };
      ci.addEventListener('keydown', e=>{ if (e.key==='Enter') go(); });
      out.push(h('div',{class:'panel row'}, ci, h('button',{class:'btn primary', onclick:go}, 'Freischalten')));
    }
    out.push(sectionTitle(null, 'Audio und Mikrofon'));
    out.push(settingsPanel());
    if (!DICT) out.push(h('p',{class:'small muted', style:'margin-top:8px'}, 'Spracherkennung gibt es in Chrome, Edge und Safari. In anderen Browsern sprichst du laut und tippst optional mit.'));
    out.push(sectionTitle(null, 'Daten sichern', 'Dein Fortschritt liegt nur in diesem Browser. Sichere ihn als Datei, um ihn auf ein anderes Gerät mitzunehmen oder vor dem Löschen des Browserverlaufs zu schützen.'));
    const file = h('input',{type:'file', accept:'application/json,.json', hidden:true, onchange:e=>{ const f=e.target.files[0]; if (f) importData(f); }});
    let armed = false;
    const reset = h('button',{class:'btn ghost danger', onclick:()=>{
      if (!armed){ armed=true; reset.textContent='Wirklich alles löschen?'; setTimeout(()=>{ armed=false; reset.textContent='Fortschritt zurücksetzen'; }, 4000); return; }
      for (let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if (k && k.startsWith('toefl.')) localStorage.removeItem(k); }
      location.reload(); }}, 'Fortschritt zurücksetzen');
    out.push(h('div',{class:'panel row'}, h('button',{class:'btn primary', onclick:exportData}, 'Fortschritt exportieren'), h('button',{class:'btn', onclick:()=>file.click()}, 'Sicherung einlesen'), file, h('span',{class:'spacer', style:'flex:1'}), reset));
    out.push(sectionTitle(null, 'Format und Scoring'));
    out.push(formatPanel());
    out.push(h('div',{class:'callout', style:'margin-top:24px'}, 'Format, Fragenzahlen, Zeiten und Bewertungsraster folgen der veröffentlichten Testspezifikation 2026. Die Aufgaben sind eigene Übungsinhalte, keine ETS-Fragen. Die Bänder sind Schätzungen, eine offizielle Umrechnungstabelle gibt es nicht. Ohne KI-Bewertung schätzt du Writing und Speaking selbst anhand des Rasters ein.'));
    out.push(h('p',{style:'margin-top:18px'}, h('button',{class:'link-btn', onclick:()=>window.dispatchEvent(new Event('bandsix:landing'))}, '← Zur Bandsix-Startseite')));
    return out;
  }

  const VIEWS = {start:viewStart, tests:viewTests, training:viewTraining, progress:viewProgress, more:viewMore};
  renderHome = function(){
    VIEW='home'; renderBar(); APP.replaceChildren();
    APP.append(h('div',{class:'view view-'+TAB}, VIEWS[TAB]()));
  };

  /* ---------- inner views: same visual language as the landing page ---------- */
  const SEC_LABEL = {reading:'Reading', listening:'Listening', writing:'Writing', speaking:'Speaking'};
  function stageBanner(opts){
    // opts: sec, kicker, title, sub, meta (array of strings), right (node), big (string)
    return h('section',{class:'stage-hero'+(opts.compact?' compact':'')+(opts.sec?' sec-'+opts.sec:'')},
      h('div',{class:'aurora', 'aria-hidden':'true'}, h('b'),h('b'),h('b')),
      h('div',{class:'stage-hero-main'},
        h('div',{class:'stage-kicker'}, opts.sec ? h('span',{class:'stage-dot'}) : null, opts.kicker),
        h(opts.compact?'h2':'h1',null, opts.title),
        opts.sub ? h('p',{class:'stage-sub'}, opts.sub) : null,
        opts.meta && opts.meta.length ? h('div',{class:'stage-meta'}, opts.meta.map(m=>h('span',null,m))) : null,
        opts.actions || null),
      opts.big!=null ? h('div',{class:'stage-big'}, h('b',null,opts.big), opts.bigSub? h('small',null,opts.bigSub):null) : null,
      opts.right || null);
  }


  /* ---------- helper block next to Writing and Speaking tasks (training only) ---------- */
  const HELP = {
    email:{title:'Redemittel für die E-Mail', insert:true, groups:[
      ['Einstieg', ['Dear Professor Miller,','I hope this email finds you well.','I am writing to ask whether …','I am reaching out regarding …','Thank you for getting back to me so quickly.']],
      ['Anliegen und Bitten', ['Would it be possible to …?','I would really appreciate it if you could …','Could you let me know whether …?','I was wondering if you might be able to …']],
      ['Erklären und begründen', ['To give you some context, …','The main reason is that …','Unfortunately, …','As a result, …']],
      ['Vorschläge', ['One option might be to …','Alternatively, we could …','If it suits you, I would be happy to …']],
      ['Abschluss', ['Thank you in advance for your help.','Please let me know if you need any further information.','I look forward to hearing from you.','Best regards,','Kind regards,']]],
      tips:['Jeden der drei Punkte aus der Aufgabe in einem eigenen kurzen Absatz abhaken.','Ton an den Empfänger anpassen: Professorin formell, Mitbewohner locker.','Rund 120 bis 180 Wörter reichen. Die letzte Minute zum Korrekturlesen nutzen.']},
    disc:{title:'Redemittel für die Diskussion', insert:true, groups:[
      ['Position beziehen', ['In my view, …','I firmly believe that …','While both sides raise valid points, I would argue that …','From my perspective, the most compelling argument is …']],
      ['Auf Beiträge eingehen', ['I agree with [Name] that …, but …','[Name] makes an interesting point about …; however, …','Building on [Name]’s idea, …','Unlike [Name], I think …']],
      ['Begründen', ['The main reason is that …','This matters because …','A factor that is often overlooked is …','What is more, …']],
      ['Beispiel', ['For instance, …','A good example of this is …','In my own experience, …']],
      ['Abschluss', ['All things considered, …','Ultimately, …','For these reasons, I believe …']]],
      tips:['Position gleich im ersten Satz nennen.','Einen der beiden Beiträge mit Namen aufgreifen.','Ein neues Argument bringen, das noch niemand genannt hat, und es mit einem konkreten Beispiel stützen.','Mindestens 100 Wörter.']},
    interview:{title:'Redemittel für das Interview', insert:false, groups:[
      ['Sofort einsteigen', ['That’s a great question. I’d say …','Honestly, I think …','For me personally, …']],
      ['Gliedern', ['There are two main reasons. First, … Second, …','On the one hand, … On the other hand, …','The biggest advantage is …']],
      ['Beispiel', ['For example, last semester I …','I remember when …','A good example from my own life is …']],
      ['Kurz Zeit gewinnen', ['Let me think about that for a second.','That’s something I’ve thought about quite a bit.']],
      ['Abrunden', ['So overall, I’d say …','That’s why I believe …']]],
      tips:['Sofort anfangen, es gibt keine Vorbereitungszeit.','Aufbau: Antwort, Grund, Beispiel, Fazit.','Die 45 Sekunden nutzen. Kurze Füllwörter sind normal, lange Pausen vermeiden.']},
    repeat:{title:'Tipps zum Nachsprechen', insert:false, groups:[],
      tips:['Auf Sinneinheiten hören, nicht Wort für Wort.','Satzmelodie und Betonung nachahmen.','Lieber vollständig als schnell.','Kleine Wörter wie the, to oder has been nicht verschlucken. Sie zählen mit.']},
    bas:{title:'Tipps zum Satzbau', insert:false, groups:[
      ['Muster', ['Do you know where the library is?','Could you tell me when the class starts?','I wonder whether she has finished.']]],
      tips:['Zuerst Subjekt und Verb finden.','Direkte Frage: Hilfsverb nach vorne.','Indirekte Frage (Do you know where …): danach normale Wortstellung, kein Hilfsverb vorne.','Eine Wortgruppe kann übrig bleiben.']}
  };
  function insertPhrase(main, text){
    const ta = main.querySelector('textarea'); if (!ta) return;
    const st = ta.selectionStart ?? ta.value.length, en = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, st), after = ta.value.slice(en);
    const clean = text.replace(/ …\??$/,' ').replace(/…/g,'');
    const sep = before && !/[\s\n]$/.test(before) ? ' ' : '';
    ta.value = before + sep + clean + after;
    const pos = (before + sep + clean).length; ta.focus(); ta.setSelectionRange(pos, pos);
    ta.dispatchEvent(new Event('input', {bubbles:true}));
  }
  function helperBlock(type, main){
    const H = HELP[type]; if (!H) return null;
    let open = window.innerWidth > 1000; try { const v = sessionStorage.getItem('bandsix.helper'); if (v) open = v==='1'; } catch(e){}
    const det = h('details',{class:'helper', open: open ? '' : null, ontoggle:()=>{ try{ sessionStorage.setItem('bandsix.helper', det.open?'1':'0'); }catch(e){} }},
      h('summary',null, h('span',{class:'helper-ic', 'aria-hidden':'true'}, '✦'), H.title),
      h('div',{class:'helper-body'},
        H.insert ? h('p',{class:'small muted'}, 'Antippen fügt die Wendung an der Cursorposition ein.') : null,
        H.groups.map(([g, list])=>h('div',{class:'helper-group'}, h('b',null,g),
          h('div',{class:'helper-list'}, list.map(t => H.insert ? h('button',{class:'phrase', type:'button', onclick:()=>insertPhrase(main, t)}, t) : h('span',{class:'phrase static'}, t))))),
        h('div',{class:'helper-group'}, h('b',null,'Tipps'), h('ul',null, H.tips.map(t=>h('li',null,t))))));
    return det;
  }

  const origRenderUnit = renderUnit;
  renderUnit = function(){
    origRenderUnit();
    if (!RUN || (RUN.mode==='exam' && RUN.showIntro)) return;
    const wrap = APP.firstElementChild; if (!wrap) return;
    wrap.classList.add('run-view', 'mode-'+RUN.mode);
    const s = RUN.secs[RUN.si]; const u = curUnit(); const T = TYPES[u.type];
    const head = wrap.firstElementChild;
    const pos = RUN.mode==='train' ? `Aufgabe ${RUN.ui+1} von ${s.units.length}` : `Teil ${RUN.ui+1} von ${s.units.length}`;
    const banner = stageBanner({compact:true, sec:s.key, kicker:(RUN.mode==='exam'?'Probetest · ':'Training · ')+SEC_LABEL[s.key], title:T.name, sub:T.en, meta:[pos]});
    if (head) head.replaceWith(banner);
    const dir = wrap.querySelector(':scope > .directions');
    if (dir){
      dir.classList.add('howto');
      const tips = dir.querySelector('ul');
      const intro = [...dir.childNodes].filter(n=>n!==tips && !(n.tagName==='B'));
      dir.replaceChildren(
        h('div',{class:'howto-ic', 'aria-hidden':'true'}, 'i'),
        h('div',{class:'howto-body'}, h('b',null,'So funktioniert es'), h('p',null, intro.map(n=>n.textContent).join('').trim()), tips ? h('ul',null, [...tips.children].map(li=>h('li',null, li.textContent))) : null));
    }
    const foot = wrap.querySelector(':scope > .foot'); if (foot) foot.classList.add('run-foot');
    if (RUN.mode==='train' && HELP[u.type]){
      const kids = [...wrap.children].filter(n=>n!==banner && n!==foot);
      const main = h('div',{class:'stack run-main'}); kids.forEach(n=>main.append(n));
      const aside = helperBlock(u.type, main);
      const grid = h('div',{class:'run-grid'}, main, aside);
      if (foot) foot.before(grid); else wrap.append(grid);
    }
  };

  const origIntro = renderSectionIntro;
  renderSectionIntro = function(s){
    origIntro(s);
    const card = APP.lastElementChild; if (!card) return;
    const items = [...card.querySelectorAll('li')].map(li=>li.textContent);
    const ps = [...card.querySelectorAll(':scope > p')].map(p=>p.textContent);
    const btn = card.querySelector('.btn.primary');
    if (btn){ btn.classList.add('lg'); btn.textContent = 'Abschnitt starten →'; }
    const types = h('div',{class:'intro-types'}, items.map(t=>{ const [name,n]=t.split(' · '); return h('div',{class:'intro-type'}, h('b',null,n||''), h('span',null,name)); }));
    const hero = stageBanner({sec:s.key, kicker:RUN.title.split(' · ')[0], title:SEC_LABEL[s.key], sub:ps[0]||'', actions:h('div',{class:'stage-actions'}, btn)});
    hero.classList.add('intro');
    const wrap = h('div',{class:'intro-wrap'}, hero, types, ps[1] ? h('div',{class:'callout'}, ps[1]) : null);
    card.replaceWith(wrap);
  };

  const origType = renderType;
  renderType = function(t){
    origType(t);
    const wrap = APP.firstElementChild; if (!wrap) return;
    wrap.classList.add('type-view');
    const T = TYPES[t];
    const kids = [...wrap.children];
    // kids: [back row, title block, pills row, actions row, (note), table panel, note]
    const pills = kids[2], actions = kids[3];
    const meta = pills ? [...pills.querySelectorAll('.pill')].map(p=>p.textContent) : [];
    if (actions) actions.querySelectorAll('.btn:not(.primary)').forEach(b=>b.classList.add('glass'));
    const banner = stageBanner({sec:T.sec, kicker:SEC_LABEL[T.sec]+' · '+SEC[T.sec].de, title:T.name, sub:T.de, meta, actions:actions||null});
    kids[1].replaceWith(banner); if (pills) pills.remove(); if (kids[0] && kids[0].querySelector('.btn')) kids[0].remove();
    const tbl = wrap.querySelector('table'); if (tbl) tbl.closest('.panel').classList.add('item-list');
    if (tbl && !unlocked()){
      const items = trainPool(t); const rows = [...tbl.querySelectorAll('tbody tr')];
      rows.forEach((tr,i)=>{ const it = items[i]; if (!it || isFree(t,it.id)) return;
        tr.classList.add('locked');
        const cells = tr.children;
        if (cells[1]) cells[1].replaceChildren(h('span',{class:'pill lock'}, h('span',{svg:IC_LOCK}), 'Paket'));
        if (cells[2]) cells[2].replaceChildren(h('button',{class:'btn small', onclick:()=>paywall('Mehr Aufgaben für '+T.name)}, 'Freischalten'));
      });
      const nFree = freePool(t).length;
      if (nFree < items.length) tbl.closest('.panel').before(h('p',{class:'small muted'}, nFree+' von '+items.length+' Aufgaben sind kostenlos. Die übrigen gibt es bald als Aufgabenpaket.'));
      const doneT = store.get('done', {}); const openFree = freePool(t).filter(x=>!doneT[t+':'+x.id]).length;
      actions && actions.querySelectorAll('.btn').forEach(b=>{
        if (b.textContent==='Alle üben') b.textContent = 'Alle Gratis-Aufgaben üben';
        else if (/^Alle offenen üben/.test(b.textContent)){ if (openFree) b.textContent = 'Alle offenen üben ('+openFree+')'; else b.remove(); }
      });
    }
  };

  const origResults = renderResults;
  renderResults = function(){
    origResults();
    const wrap = APP.firstElementChild; if (!wrap) return;
    wrap.classList.add('results-view');
    const head = wrap.firstElementChild;
    if (RUN && RUN.mode==='train'){
      const panel = wrap.querySelector(':scope > .panel');
      const big = panel && /\d+ \/ \d+/.test(panel.firstElementChild?.textContent||'') ? panel.firstElementChild.textContent : null;
      const sub = panel ? (panel.querySelector('p')?.textContent||'') : '';
      const title = wrap.querySelector('h1')?.textContent || RUN.title;
      const eb = wrap.querySelector(':scope > .eyebrow'); const h1 = wrap.querySelector(':scope > h1');
      const banner = stageBanner({sec:RUN.secs[0].key, kicker:'Training beendet', title, sub, big, bigSub: big ? 'richtig' : null});
      if (eb) eb.replaceWith(banner); else if (head) head.before(banner);
      if (h1) h1.remove(); if (big && panel) panel.remove();
      wrap.classList.remove('narrow'); wrap.style.margin='';
      return;
    }
    const overall = wrap.querySelector('.bandtile.overall .v')?.textContent;
    const overSub = wrap.querySelector('.bandtile.overall .small')?.textContent;
    const banner = stageBanner({kicker:'Auswertung · Schätzung', title:RUN.title, sub:'Geschätztes Band aus deinen Antworten. Der echte Test ist adaptiv, rechne mit ±0,5 Band.', big:(overall && overall!=='–')?overall:null, bigSub:overSub||''});
    if (head) head.replaceWith(banner);
  };

  // The engine rendered its own home before this script loaded; replace it.
  if (VIEW==='home') renderHome(); else renderBar();
})();
