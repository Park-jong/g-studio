import { STORAGE_PREFIX } from '../config';

/** localStorage와 같은 모양의 작은 인터페이스 (테스트에서 가짜로 교체) */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 메모리 저장소. localStorage를 못 쓰는 환경(사생활 보호 모드, 테스트)의 대체 */
export class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** 브라우저 localStorage, 접근이 막혀 있으면 메모리 저장소 */
export function browserStorage(): StorageLike {
  try {
    const s = window.localStorage;
    const probe = `${STORAGE_PREFIX}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return new MemoryStorage();
  }
}

/**
 * 한 덩어리의 저장 데이터를 읽고 쓴다.
 * - 읽을 때는 sanitize로 필드 단위 보정한다 (알 수 없는 값은 기본값, 살릴 수 있는 필드는 살림).
 * - 필드를 추가할 때 버전을 올리지 말고 sanitize에서 누락 필드를 기본값으로 채운다.
 *   버전을 올리면 migrate에서 이전 데이터를 옮겨야 진행도가 초기화되지 않는다.
 * - 쓰기 실패(용량 초과 등)는 무시하고 현재 실행의 값은 유지한다.
 */
export class SaveStore<T> {
  private readonly key: string;

  constructor(
    name: string,
    private readonly storage: StorageLike,
    private readonly sanitize: (raw: unknown) => T,
  ) {
    this.key = `${STORAGE_PREFIX}:${name}`;
  }

  load(): T {
    let raw: unknown = undefined;
    try {
      const text = this.storage.getItem(this.key);
      raw = text === null ? undefined : JSON.parse(text);
    } catch {
      raw = undefined;
    }
    return this.sanitize(raw);
  }

  save(data: T): boolean {
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* 무시 */
    }
  }
}

/** sanitize 작성용 도우미 */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function intInRange(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
}
