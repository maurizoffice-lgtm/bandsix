// Replaces the claude.ai runtime the prototype was written for.
// tts:       not provided -> the engine uses the browser's speechSynthesis voices
// dictation: browser speech recognition (Web Speech API) where available
// sample:    AI calls via our server endpoint, only when VITE_AI_ENDPOINT is configured
// db:        not provided yet -> progress lives in localStorage

type Cb<T> = ((e: T) => void) | null;
type StateEvt = { state: 'listening' | 'idle'; reason?: string };

interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null;
  onstart: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}

function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Rough word set for comparing an alternative with the expected sentence. */
function bag(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
}
/**
 * When the app knows what the speaker is expected to say (Listen and Repeat), it sets
 * window.bandsixDictHint. Among the recogniser's alternatives we keep the one closest to that
 * sentence, so an acoustically equal but differently written guess does not count against the
 * speaker. Without a hint the recogniser's own best guess is used.
 */
function pickAlternative(r: any): string {
  const first = String(r?.[0]?.transcript || '').trim();
  const hint = (window as any).bandsixDictHint as string | undefined;
  if (!hint || !r || r.length < 2) return first;
  const ref = new Set(bag(hint));
  let best = first, bestScore = -Infinity;
  for (let k = 0; k < r.length; k++) {
    const t = String(r[k]?.transcript || '').trim();
    if (!t) continue;
    const w = bag(t);
    const score = w.filter((x) => ref.has(x)).length - 0.25 * w.filter((x) => !ref.has(x)).length - k * 0.01;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

class BrowserDictation {
  private rec: SpeechRecognitionLike | null = null;
  private running = false;
  private wanted = false;
  private partialCb: Cb<{ text: string }> = null;
  private finalCb: Cb<{ text: string }> = null;
  private stateCb: Cb<StateEvt> = null;

  onPartial(cb: Cb<{ text: string }>) { this.partialCb = cb; }
  onFinal(cb: Cb<{ text: string }>) { this.finalCb = cb; }
  onState(cb: Cb<StateEvt>) { this.stateCb = cb; }
  active() { return this.wanted; }

  start(_opts?: { language?: string }): Promise<void> {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return Promise.reject({ code: 'unsupported' });
    this.abortQuietly();
    this.wanted = true;
    return new Promise((resolve, reject) => {
      let settled = false;
      const open = () => {
        const rec = new Ctor();
        this.rec = rec;
        rec.lang = 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        try { (rec as any).maxAlternatives = 5; } catch { /* not supported */ }
        rec.onstart = () => {
          this.running = true;
          this.stateCb?.({ state: 'listening' });
          if (!settled) { settled = true; resolve(); }
        };
        rec.onresult = (e: any) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const text = pickAlternative(r);
            if (!text) continue;
            if (r.isFinal) this.finalCb?.({ text });
            else interim += (interim ? ' ' : '') + text;
          }
          if (interim) this.partialCb?.({ text: interim });
        };
        rec.onerror = (e: any) => {
          const err = String(e?.error || '');
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            this.wanted = false;
            this.stateCb?.({ state: 'idle', reason: 'not_granted' });
            if (!settled) { settled = true; reject({ code: 'not_granted' }); }
          } else if (err === 'audio-capture') {
            this.wanted = false;
            if (!settled) { settled = true; reject({ code: 'no_microphone' }); }
          }
          // 'no-speech' and 'aborted' are handled by onend (restart while wanted)
        };
        rec.onend = () => {
          this.running = false;
          // Browsers end recognition after silence; keep listening until stop() is called.
          if (this.wanted && this.rec === rec) {
            try { open(); } catch { this.wanted = false; this.stateCb?.({ state: 'idle', reason: 'error' }); }
            return;
          }
          this.stateCb?.({ state: 'idle', reason: 'stopped' });
        };
        try { rec.start(); } catch (err) {
          if (!settled) { settled = true; reject({ code: 'upstream_error' }); }
        }
      };
      open();
    });
  }

  stop(): Promise<void> {
    this.wanted = false;
    const rec = this.rec;
    if (!rec || !this.running) return Promise.resolve();
    return new Promise((resolve) => {
      const prev = rec.onend;
      // Give the recognizer a moment to deliver the last final result.
      const done = () => { resolve(); };
      rec.onend = () => { prev?.call(rec); done(); };
      try { rec.stop(); } catch { done(); }
      setTimeout(done, 1500);
    });
  }

  private abortQuietly() {
    if (!this.rec) return;
    this.wanted = false;
    try { this.rec.onend = null; this.rec.abort(); } catch { /* ignore */ }
    this.rec = null;
    this.running = false;
  }
}

function sampleAdapter(endpoint: string) {
  return {
    async json(prompt: string): Promise<unknown> {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const body = (await r.json().catch(() => ({}))) as { result?: unknown; code?: string };
      if (!r.ok) throw { code: body.code || 'upstream_error' };
      return body.result;
    },
  };
}

export function createRuntime() {
  const aiEndpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
  return {
    use(name: string): Promise<unknown> {
      if (name === 'dictation' && speechRecognitionCtor()) return Promise.resolve(new BrowserDictation());
      if (name === 'sample' && aiEndpoint) return Promise.resolve(sampleAdapter(aiEndpoint));
      return Promise.reject({ code: 'unavailable' });
    },
  };
}
