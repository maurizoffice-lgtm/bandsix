import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Load the content files exactly as the browser does (classic scripts, shared global scope).
function loadContent() {
  const ctx = vm.createContext({ console });
  for (const f of ['c1_reading.js', 'c2_listening.js', 'c3_ws.js', 'c4_train.js', 'c5_listen2.js']) {
    vm.runInContext(readFileSync(`public/legacy/${f}`, 'utf8'), ctx, { filename: f });
  }
  return vm.runInContext('({POOL, MOCKS})', ctx) as { POOL: Record<string, any[]>; MOCKS: any[] };
}

const { POOL, MOCKS } = loadContent();
const TYPES = ['cw', 'daily', 'acad', 'lcr', 'lconv', 'lann', 'ltalk', 'bas', 'email', 'disc', 'repeat', 'interview'];

const questions = (type: string, item: any): number => {
  if (type === 'cw') return 10;
  if (type === 'lcr' || type === 'bas' || type === 'email' || type === 'disc') return 1;
  if (type === 'repeat') return item.items.length;
  return item.qs.length;
};

describe('content pool', () => {
  it('has items for all eleven task types', () => {
    for (const t of TYPES) expect(POOL[t]?.length, t).toBeGreaterThan(0);
  });
  it('has unique ids per type', () => {
    for (const t of TYPES) {
      const ids = POOL[t].map((x) => x.id);
      expect(new Set(ids).size, t).toBe(ids.length);
    }
  });
  it('multiple-choice questions have 4 options and a valid answer', () => {
    const check = (q: any, where: string) => {
      expect(q.o, where).toHaveLength(4);
      expect(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, where).toBe(true);
    };
    for (const t of ['daily', 'acad', 'lconv', 'lann', 'ltalk']) for (const it of POOL[t]) for (const q of it.qs) check(q, `${t}/${it.id}`);
    for (const it of POOL.lcr) check(it, `lcr/${it.id}`);
  });
});

describe('mock tests', () => {
  it('has mock A and B', () => {
    expect(MOCKS.map((m) => m.id)).toEqual(expect.arrayContaining(['A', 'B']));
  });
  for (const id of ['A', 'B']) {
    it(`mock ${id} has full ETS length (R 50, L 47, W 12, S 11)`, () => {
      const m = MOCKS.find((x) => x.id === id);
      const count = (sec: string) =>
        Object.entries(m[sec] as Record<string, string[]>).reduce((sum, [t, ids]) =>
          sum + ids.reduce((s, i) => {
            const item = POOL[t].find((x) => x.id === i);
            expect(item, `${t}/${i}`).toBeTruthy();
            return s + questions(t, item);
          }, 0), 0);
      expect(count('reading')).toBe(50);
      expect(count('listening')).toBe(47);
      expect(count('writing')).toBe(12);
      expect(count('speaking')).toBe(11);
    });
  }
});
