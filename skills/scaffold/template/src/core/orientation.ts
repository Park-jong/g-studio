/** 화면 방향이 의도와 다른지 지켜보는 객체. 창 크기를 읽는 함수를 주입받는다 */
export class OrientationWatcher {
  private wrong: boolean;
  private readonly listeners = new Set<(wrong: boolean) => void>();

  constructor(
    private readonly want: 'landscape' | 'portrait',
    private readonly readSize: () => { width: number; height: number },
  ) {
    this.wrong = this.compute();
  }

  /** 지금 방향이 의도와 다른지 (회전 안내를 띄울지) */
  get isWrong(): boolean {
    return this.wrong;
  }

  /** 크기가 바뀌었을 때 호출한다. 상태가 달라졌을 때만 알린다 */
  refresh(): void {
    const next = this.compute();
    if (next === this.wrong) return;
    this.wrong = next;
    for (const fn of [...this.listeners]) fn(next);
  }

  subscribe(fn: (wrong: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private compute(): boolean {
    const { width, height } = this.readSize();
    const portrait = height > width;
    return this.want === 'landscape' ? portrait : !portrait;
  }
}

/** Phaser 레지스트리에서 OrientationWatcher를 찾는 키 */
export const ORIENTATION_KEY = 'orientation';
