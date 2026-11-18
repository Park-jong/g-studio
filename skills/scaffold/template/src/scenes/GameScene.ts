import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getSession } from '../session';
import { CharacterView } from '../skins/CharacterView';

const PLAYER = 'hero:player';
const SPEED = 240;

/**
 * 뼈대 확인용 데모 화면: 방향키/드래그로 이동, K로 스킨 바꾸기(저장됨).
 * 실제 게임 화면으로 교체할 때 CharacterView 사용 방식만 참고하고 지운다.
 * 게임 규칙은 Phaser에 의존하지 않는 모듈(src/<도메인>/)에 두고, 씬은 입력·표시만 담당한다.
 */
export class GameScene extends Phaser.Scene {
  private player!: CharacterView;
  private pos = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  private target: { x: number; y: number } | null = null;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(data: { stage?: number }): void {
    const session = getSession(this);
    this.player = new CharacterView(this, session.skinRegistry, session.skins.resolve(PLAYER), this.pos.x, this.pos.y);

    this.label = this.add.text(12, 10, '', { fontFamily: 'Malgun Gothic, sans-serif', fontSize: '16px', color: '#cfd6ff' });
    this.refreshLabel(data.stage ?? 0);

    this.keys = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown-K', () => {
      this.player.setSkin(session.skins.cycle(PLAYER));
      session.persist();
      this.refreshLabel(data.stage ?? 0);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.target = { x: p.worldX, y: p.worldY }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.target = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerup', () => (this.target = null));
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    let dx = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    let dy = (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
    if (this.target && dx === 0 && dy === 0) {
      const tx = this.target.x - this.pos.x;
      const ty = this.target.y - this.pos.y;
      const d = Math.hypot(tx, ty);
      if (d > 4) {
        dx = tx / d;
        dy = ty / d;
      }
    }
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy);
      this.pos.x = Phaser.Math.Clamp(this.pos.x + (dx / len) * SPEED * dt, 20, GAME_WIDTH - 20);
      this.pos.y = Phaser.Math.Clamp(this.pos.y + (dy / len) * SPEED * dt, 40, GAME_HEIGHT - 20);
      if (dx !== 0) this.player.setFacing(dx > 0);
    }
    this.player.setPosition(this.pos.x, this.pos.y);
    this.player.play(moving ? 'walk' : 'idle');
  }

  private refreshLabel(stage: number): void {
    const skin = getSession(this).skins.resolve(PLAYER);
    this.label.setText(`스테이지 ${stage} · 스킨: ${skin.name}  (방향키/드래그 이동, K 스킨 변경)`);
  }
}
