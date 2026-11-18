import Phaser from 'phaser';
import pkg from '../../package.json';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, GAME_HEIGHT * 0.38, '__GAME_TITLE__', { fontFamily: 'Malgun Gothic, sans-serif', fontSize: '48px', color: '#f3ead4' })
      .setOrigin(0.5);
    const start = this.add
      .text(cx, GAME_HEIGHT * 0.62, '눌러서 시작', { fontFamily: 'Malgun Gothic, sans-serif', fontSize: '24px', color: '#cfd6ff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    // 배포된 버전 확인용
    this.add
      .text(GAME_WIDTH - 10, GAME_HEIGHT - 8, `v${pkg.version}`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#7d84a8' })
      .setOrigin(1, 1);

    const go = () => this.scene.start('Game', { stage: 0 });
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }
}
