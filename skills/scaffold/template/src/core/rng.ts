/** 주입 가능한 난수 생성기. 게임 로직은 Math.random 대신 이것을 받아 쓴다 (테스트·시뮬 재현용) */
export interface Rng {
  /** 0 이상 1 미만 */
  next(): number;
}

/** 시드 고정 RNG (mulberry32) */
export class SeededRng implements Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** min 이상 max 이하 정수 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('빈 배열에서 고를 수 없습니다');
    return items[Math.floor(this.next() * items.length)];
  }
}

export class MathRng implements Rng {
  next(): number {
    return Math.random();
  }
}
