import Phaser from 'phaser';
import { getSession } from '../session';
import { queueSkinAssets } from '../skins/CharacterView';

/** 에셋을 올리고, ?stage가 있으면 바로 게임 화면, 없으면 타이틀로 간다 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    queueSkinAssets(this, getSession(this).skinRegistry);
  }

  create(): void {
    const { stage } = getSession(this).debug;
    if (stage !== null) this.scene.start('Game', { stage });
    else this.scene.start('Title');
  }
}
