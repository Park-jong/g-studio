import { parseDebugParams, type DebugParams } from './core/debugParams';
import { MathRng, SeededRng, type Rng } from './core/rng';
import { SaveStore, isRecord, type StorageLike } from './core/storage';
import { SkinSelection, sanitizeSkinSelection } from './skins/SkinSelection';
import type { SkinRegistry } from './skins/SkinRegistry';
import type { SkinSelectionData } from './skins/skinTypes';

/** 저장 데이터. 필드를 추가하면 defaultSave와 sanitizeSave에 함께 넣는다 (버전은 올리지 않는다) */
export interface SaveData {
  version: 1;
  skins: SkinSelectionData;
}

export function defaultSave(): SaveData {
  return { version: 1, skins: { selectedBySubject: {} } };
}

export function sanitizeSave(raw: unknown, registry: SkinRegistry): SaveData {
  const out = defaultSave();
  if (!isRecord(raw)) return out;
  out.skins = sanitizeSkinSelection(raw.skins, registry);
  return out;
}

/**
 * 씬들이 함께 쓰는 서비스 묶음. main.ts에서 한 번 만들어 Phaser 레지스트리에 넣는다.
 * 씬은 getSession(this)로 꺼내 쓴다.
 */
export class Session {
  readonly debug: DebugParams;
  readonly rng: Rng;
  readonly skins: SkinSelection;
  private readonly store: SaveStore<SaveData>;

  constructor(storage: StorageLike, readonly skinRegistry: SkinRegistry, search: string) {
    this.debug = parseDebugParams(search);
    this.rng = this.debug.seed !== null ? new SeededRng(this.debug.seed) : new MathRng();
    this.store = new SaveStore('save', storage, (raw) => sanitizeSave(raw, skinRegistry));
    if (this.debug.resetSave) this.store.clear();
    const data = this.store.load();
    this.skins = new SkinSelection(skinRegistry, data.skins, this.debug.skins);
  }

  persist(): void {
    this.store.save({ version: 1, skins: this.skins.snapshot() });
  }
}

export const SESSION_KEY = 'session';

export function getSession(scene: { registry: { get(key: string): unknown } }): Session {
  return scene.registry.get(SESSION_KEY) as Session;
}
