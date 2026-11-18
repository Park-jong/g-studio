import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../core/storage';
import { Session } from '../session';
import { SkinRegistry } from './SkinRegistry';
import { SkinSelection, sanitizeSkinSelection } from './SkinSelection';
import { SKINS, ASSETS, createSkinRegistry } from './skins';
import type { SkinDef } from './skinTypes';

const look = { shape: 'rect' as const, color: 0, width: 1, height: 1 };
const skin = (subjectKey: string, skinId: string, extra: Partial<SkinDef> = {}): SkinDef => ({ subjectKey, skinId, name: skinId, placeholder: look, ...extra });

describe('SkinRegistry 검증', () => {
  it('등록된 실제 데이터는 유효하다', () => {
    expect(() => new SkinRegistry(ASSETS, SKINS)).not.toThrow();
  });
  it('default 없음, 중복, 없는 에셋, 빈 프레임, fps 0을 거부한다', () => {
    expect(() => new SkinRegistry([], [skin('ally:a', 'red')])).toThrow(/default/);
    expect(() => new SkinRegistry([], [skin('ally:a', 'default'), skin('ally:a', 'default')])).toThrow(/중복/);
    expect(() => new SkinRegistry([], [skin('ally:a', 'default', { assetKey: 'nope' })])).toThrow(/에셋/);
    expect(() => new SkinRegistry([], [skin('ally:a', 'default', { clips: { idle: { frames: [], fps: 4, loop: true } } })])).toThrow(/프레임/);
    expect(() => new SkinRegistry([], [skin('ally:a', 'default', { clips: { idle: { frames: [0], fps: 0, loop: true } } })])).toThrow(/fps/);
    expect(() => new SkinRegistry([], [skin('noColon', 'default')])).toThrow(/형식/);
  });
  it('없는 스킨은 기본 스킨, 로딩 실패한 에셋은 이미지 사용 불가', () => {
    const r = new SkinRegistry(
      [{ key: 'img', type: 'image', url: 'assets/x.png' }],
      [skin('ally:a', 'default', { assetKey: 'img' })],
    );
    expect(r.get('ally:a', 'ghost').skinId).toBe('default');
    expect(r.canUseImage(r.get('ally:a'))).toBe(true);
    r.markMissing('img');
    expect(r.canUseImage(r.get('ally:a'))).toBe(false);
  });
});

describe('SkinSelection', () => {
  const r = new SkinRegistry([], [skin('ally:a', 'default'), skin('ally:a', 'red'), skin('enemy:b', 'default')]);

  it('잘못된 저장값은 버린다', () => {
    const raw = { selectedBySubject: { 'ally:a': 'red', 'enemy:b': 'red', 'ghost:x': 'default', 'ally:z': 3 } };
    expect(sanitizeSkinSelection(raw, r)).toEqual({ selectedBySubject: { 'ally:a': 'red' } });
    expect(sanitizeSkinSelection('junk', r)).toEqual({ selectedBySubject: {} });
  });
  it('선택·순환·임시 덮어쓰기', () => {
    const s = new SkinSelection(r);
    expect(s.select('enemy:b', 'red')).toBe(false);
    expect(s.cycle('ally:a').skinId).toBe('red');
    expect(s.cycle('ally:a').skinId).toBe('default');
    const o = new SkinSelection(r, undefined, { 'ally:a': 'red' });
    expect(o.resolve('ally:a').skinId).toBe('red');
    expect(o.snapshot()).toEqual({ selectedBySubject: {} });
  });
});

describe('Session 저장', () => {
  it('스킨 선택이 저장되고 ?resetSave=1이면 지워진다', () => {
    const storage = new MemoryStorage();
    const a = new Session(storage, createSkinRegistry(), '');
    a.skins.select('hero:player', 'alt');
    a.persist();
    expect(new Session(storage, createSkinRegistry(), '').skins.selectedId('hero:player')).toBe('alt');
    expect(new Session(storage, createSkinRegistry(), '?resetSave=1').skins.selectedId('hero:player')).toBe('default');
  });
});
