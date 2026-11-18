import { describe, expect, it } from 'vitest';
import { parseDebugParams } from './debugParams';
import { OrientationWatcher } from './orientation';
import { SeededRng } from './rng';
import { MemoryStorage, SaveStore, intInRange, isRecord } from './storage';

describe('SeededRng', () => {
  it('같은 시드는 같은 수열', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 5; i++) expect(a.next()).toBe(b.next());
  });
  it('int는 범위 안', () => {
    const r = new SeededRng(1);
    for (let i = 0; i < 200; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
  it('빈 배열 pick은 오류', () => {
    expect(() => new SeededRng(1).pick([])).toThrow(RangeError);
  });
});

describe('SaveStore', () => {
  const sanitize = (raw: unknown) => ({ n: isRecord(raw) ? intInRange(raw.n, 0, 10, 0) : 0 });

  it('저장한 값을 다시 읽는다', () => {
    const s = new SaveStore('t', new MemoryStorage(), sanitize);
    s.save({ n: 7 });
    expect(s.load()).toEqual({ n: 7 });
  });
  it('깨진 JSON과 범위 밖 값은 보정한다', () => {
    const storage = new MemoryStorage();
    const s = new SaveStore('t', storage, sanitize);
    storage.setItem('__GAME_ID__:t', '{broken');
    expect(s.load()).toEqual({ n: 0 });
    storage.setItem('__GAME_ID__:t', '{"n":99}');
    expect(s.load()).toEqual({ n: 10 });
  });
  it('쓰기 실패는 false', () => {
    const s = new SaveStore('t', { getItem: () => null, setItem: () => { throw new Error('full'); }, removeItem: () => {} }, sanitize);
    expect(s.save({ n: 1 })).toBe(false);
  });
});

describe('parseDebugParams', () => {
  it('파라미터를 읽는다', () => {
    const p = parseDebugParams('?stage=3&seed=9&resetSave=1&skin=hero:player:alt,ally:goblin:red');
    expect(p).toEqual({ stage: 3, seed: 9, resetSave: true, skins: { 'hero:player': 'alt', 'ally:goblin': 'red' } });
  });
  it('없거나 잘못된 값은 null', () => {
    expect(parseDebugParams('?stage=abc')).toEqual({ stage: null, seed: null, resetSave: false, skins: {} });
  });
});

describe('OrientationWatcher', () => {
  it('가로 게임에서 세로가 되면 알린다', () => {
    let size = { width: 800, height: 400 };
    const w = new OrientationWatcher('landscape', () => size);
    const seen: boolean[] = [];
    w.subscribe((v) => seen.push(v));
    expect(w.isWrong).toBe(false);
    size = { width: 400, height: 800 };
    w.refresh();
    w.refresh();
    expect(seen).toEqual([true]);
  });
});
