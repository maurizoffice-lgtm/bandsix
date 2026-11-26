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
    for (const ty of TYPE_ORDER.filter(x=>TYPES[x].sec===sec)){ const p=trainPool(ty); n+=p.length; d+=p.filter(x=>done[ty+':'+x.id]).length; }
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
        const pool = trainPool(ty).filter(x=>!used.has(ty+':'+x.id)).sort((a,b)=>((done[ty+':'+a.id]||{}).d||0)-((done[ty+':'+b.id]||{}).d||0));
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
        h('h1',null, ex ? 'Weiter Richtung Band 6.' : 'Bereit für deinen ersten Probetest?'),
        h('p',{class:'lead'}, ex ? `Dein letzter Probetest: ${ex.title}. Trainiere jetzt gezielt die Aufgabentypen, die dich am meisten kosten.` : 'Ein kompletter Probetest zeigt dir in 85 Minuten, wo du stehst. Danach trainierst du gezielt deine Schwächen.'),
        h('div',{class:'row'},
          h('button',{class:'btn primary lg', onclick:()=>{ const m = MOCKS.find(m=>!store.get('history',[]).some(x=>x.title && x.title.includes(m.name))) || MOCKS[0]; startRun(buildMock(m)); }}, ex ? 'Nächsten Probetest starten' : 'Probetest starten'),
          h('button',{class:'btn glass lg', onclick:()=>setTab('training')}, 'Zum Training'))),
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
    const nextType = TYPE_ORDER.map(t=>({t, open: trainPool(t).filter(x=>!done[t+':'+x.id]).length, n: trainPool(t).length})).filter(x=>x.open>0).sort((a,b)=>(b.open/b.n)-(a.open/a.n))[0];
    if (nextType) recs.push(h('article',{class:'rec'}, h('div',{class:'rec-tag'}, SEC[TYPES[nextType.t].sec].name), h('h3',null, TYPES[nextType.t].name), h('p',{class:'muted small'}, nextType.open+' von '+nextType.n+' Aufgaben noch offen.'), h('button',{class:'btn small', onclick:()=>startRun(buildTrain(nextType.t))}, 'Jetzt üben')));
    if (recs.length){ out.push(sectionTitle('Heute', 'Empfohlen für dich')); out.push(h('div',{class:'recs'}, recs)); }

    // section tiles
    out.push(sectionTitle('Überblick', 'Deine vier Teile'));
    out.push(h('div',{class:'sec-tiles'}, SECS.map(sk=>{
      const s = secStats(sk);
      return h('button',{class:'stile sec-'+sk, onclick:()=>{ TAB='training'; try{sessionStorage.setItem('bandsix.tab','training');}catch(e){} renderHome(); setTimeout(()=>{ const el=document.getElementById('sec-'+sk); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); },30); }},
        h('div',{class:'stile-top'}, h('span',{class:'stile-ic', svg:SEC[sk].ic}), h('span',{class:'stile-name'}, SEC[sk].name)),
        ring(s.acc, s.acc==null?'–':s.acc+'%', s.q? s.q+' Fragen':'noch offen'),
        h('div',{class:'stile-foot'}, h('div',{class:'meter'}, h('i',{style:'width:'+(s.total? s.done/s.total*100:0)+'%'})), h('span',{class:'small muted'}, s.done+' / '+s.total+' Aufgaben')));
    })));
    return out;
  }

  function viewTests(){
    const out = [sectionTitle('Probetests', 'Unter echten Bedingungen', 'Reading 50 Fragen · Listening 47 · Writing 12 · Speaking 11. Timer nach offiziellen Vorgaben, Audio nur einmal, Auswertung am Ende. Diese Aufgaben kommen im Training nicht vor.')];
    const hist = store.get('history', []);
    out.push(h('div',{class:'mock-grid'}, MOCKS.map((m,i)=>{
      const last = hist.slice().reverse().find(x=>x.title && x.title.includes(m.name));
      const kn = knownInMock(m);
      return h('article',{class:'mock'},
        h('div',{class:'mock-art', 'aria-hidden':'true'}, h('span',null, m.id)),
        h('div',{class:'mock-body'},
          h('div',{class:'row', style:'justify-content:space-between'}, h('h3',null,m.name), h('span',{class:'pill'}, 'ca. 85 Min')),
          last && last.overall!=null ? h('p',{class:'small'}, 'Zuletzt: ', h('b',null,'Band '+last.overall.toFixed(1)), h('span',{class:'muted'}, ' · '+new Date(last.date).toLocaleDateString('de-DE'))) : h('p',{class:'small muted'}, 'Noch nicht gemacht.'),
          kn.length ? h('p',{class:'small', style:'color:var(--warn)'}, kn.length+' Aufgaben kennst du schon aus früheren Übungen.') : h('p',{class:'small', style:'color:var(--good)'}, 'Alle Aufgaben sind für dich neu.'),
          h('button',{class:'btn primary', onclick:()=>startRun(buildMock(m))}, 'Kompletten Test starten'),
          h('div',{class:'mock-parts'}, SECS.map(k=>h('button',{class:'chip-btn sec-'+k, onclick:()=>startRun(buildMock(m,k))}, h('span',{svg:SEC[k].ic}), SEC[k].name)))));
    })));
    out.push(h('div',{class:'callout'}, h('b',null,'Tipp: '), 'Plane für einen kompletten Test 85 Minuten ohne Unterbrechung ein und nutze Kopfhörer. Du kannst jederzeit ins Hauptmenü und später fortsetzen.'));
    return out;
  }

  function viewTraining(){
    const out = [sectionTitle('Training', 'Nach Aufgabentyp üben', 'Ohne Zeitdruck. Nach jeder Aufgabe siehst du die Lösung mit Erklärung auf Deutsch, beim Hören auch das Transkript.')];
    const mist = mistakeKeys(); const weak = weaknesses();
    const top = h('div',{class:'train-top'});
    if (mist.length) top.append(h('div',{class:'mini-card'}, h('div',null, h('b',null,'Fehlerheft'), h('div',{class:'small muted'}, mist.length+' Aufgaben zum Wiederholen')), h('button',{class:'btn small primary', onclick:()=>startRun(buildMistakeRun())}, 'Wiederholen')));
    if (weak.length){ const b=h('button',{class:'btn small', onclick:()=>startTargeted(b)}, 'Starten'); top.append(h('div',{class:'mini-card'}, h('div',null, h('b',null,'Schwächen gezielt trainieren'), h('div',{class:'small muted'}, weak.slice(0,3).map(w=>SKILL_DE[w.skill]||w.skill).join(' · '))), b)); }
    if (top.childElementCount) out.push(top);
    const done = store.get('done', {}); const stats = store.get('stats', {});
    for (const sk of SECS){
      out.push(h('div',{class:'type-sec', id:'sec-'+sk}, h('span',{class:'secchip sec-'+sk}, SEC[sk].name), h('span',{class:'muted small'}, SEC[sk].de)));
      out.push(h('div',{class:'type-grid'}, TYPE_ORDER.filter(t=>TYPES[t].sec===sk).map(t=>{
        const T=TYPES[t]; const pool=trainPool(t); const nDone=pool.filter(x=>done[t+':'+x.id]).length; const st=stats[t];
        const canGen = GEN[t] && SAMPLE && !AI_OFF;
        const genBtn = canGen ? h('button',{class:'btn small ghost', title:'Neue Aufgaben von der KI schreiben lassen', onclick:async()=>{ genBtn.disabled=true; genBtn.textContent='Erzeuge …'; try{ const ids=await generate(t); toast(ids.length+' neue KI-Aufgaben erstellt'); startRun(buildTrain(t, ids)); }catch(e){ genBtn.disabled=false; genBtn.textContent='+ Neue (KI)'; toast('Erzeugen hat nicht geklappt, bitte nochmal versuchen.'); } }}, '+ Neue (KI)') : null;
        return h('article',{class:'tcard sec-'+sk},
          h('div',{class:'tcard-head'}, h('span',{class:'tcard-ic', svg:SEC[sk].ic}), st && st.t ? h('span',{class:'pill '+(st.c/st.t>=.85?'good':st.c/st.t>=.7?'warn':'bad')}, Math.round(st.c/st.t*100)+' %') : null),
          h('h3',null, T.name),
          h('p',{class:'small muted'}, T.de),
          h('div',{class:'tcard-foot'},
            h('div',{class:'meter'}, h('i',{style:'width:'+(pool.length? nDone/pool.length*100:0)+'%'})),
            h('span',{class:'small muted'}, nDone+' / '+pool.length)),
          h('div',{class:'row'}, h('button',{class:'btn small primary', onclick:()=>startRun(buildTrain(t))}, 'Üben'), h('button',{class:'btn small', onclick:()=>renderType(t)}, 'Aufgaben'), genBtn));
      })));
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

  // The engine rendered its own home before this script loaded; replace it.
  if (VIEW==='home') renderHome(); else renderBar();
})();
