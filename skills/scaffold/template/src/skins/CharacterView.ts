import Phaser from 'phaser';
import type { SkinRegistry } from './SkinRegistry';
import type { AnimationState, SkinDef } from './skinTypes';

/** 등록된 에셋을 Phaser 로더에 올린다. BootScene.preload에서 호출 */
export function queueSkinAssets(scene: Phaser.Scene, registry: SkinRegistry): void {
  for (const a of registry.allAssets()) {
    if (a.type === 'image') scene.load.image(a.key, a.url);
    else if (a.type === 'spritesheet') {
      scene.load.spritesheet(a.key, a.url, {
        frameWidth: a.frameWidth,
        frameHeight: a.frameHeight,
        margin: a.margin,
        spacing: a.spacing,
      });
    } else scene.load.atlas(a.key, a.url, a.atlasUrl);
  }
  // 로딩 실패는 게임을 멈추지 않고 도형 대체 표시로 넘긴다
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    console.warn(`[skins] 에셋 로딩 실패, 도형으로 대체: ${file.key}`);
    registry.markMissing(file.key);
  });
}

function animKey(skin: SkinDef, state: AnimationState): string {
  return `${skin.subjectKey}/${skin.skinId}/${state}`;
}

/**
 * 캐릭터 하나의 화면 표시. 게임 로직(위치·상태)은 밖에서 넣어 주고, 이 객체는 그리기만 한다.
 * 이미지가 있으면 Sprite + 애니메이션, 없으면 도형. 스킨을 바꿔도 수치는 바뀌지 않는다.
 */
export class CharacterView {
  private body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Shape;
  private skin: SkinDef;
  private state: AnimationState = 'idle';
  private facingRight = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly registry: SkinRegistry,
    skin: SkinDef,
    x: number,
    y: number,
  ) {
    this.skin = skin;
    this.body = this.createBody(x, y);
  }

  get gameObject(): Phaser.GameObjects.GameObject {
    return this.body;
  }

  setPosition(x: number, y: number): void {
    this.body.setPosition(x, y);
  }

  setSkin(skin: SkinDef): void {
    const { x, y } = this.body;
    this.body.destroy();
    this.skin = skin;
    this.body = this.createBody(x, y);
    this.applyFacing();
    this.play(this.state, true);
  }

  /** 오른쪽(true)/왼쪽(false)을 바라보게 한다 */
  setFacing(right: boolean): void {
    if (right === this.facingRight) return;
    this.facingRight = right;
    this.applyFacing();
  }

  /** 동작 상태를 바꾼다. 해당 클립이 없으면 idle, 그것도 없으면 정지 프레임 */
  play(state: AnimationState, force = false): void {
    if (state === this.state && !force) return;
    this.state = state;
    if (!(this.body instanceof Phaser.GameObjects.Sprite)) return;
    const clips = this.skin.clips ?? {};
    const use: AnimationState | undefined = clips[state] ? state : clips.idle ? 'idle' : undefined;
    if (use) this.body.play(animKey(this.skin, use), true);
    else this.body.stop();
  }

  /** 피격 깜박임 (이미지·도형 공통) */
  flashHit(): void {
    this.scene.tweens.add({ targets: this.body, alpha: 0.3, duration: 60, yoyo: true, repeat: 1 });
  }

  destroy(): void {
    this.body.destroy();
  }

  private createBody(x: number, y: number): Phaser.GameObjects.Sprite | Phaser.GameObjects.Shape {
    const s = this.skin;
    if (this.registry.canUseImage(s) && this.scene.textures.exists(s.assetKey!)) {
      const sprite = this.scene.add.sprite(x, y, s.assetKey!);
      sprite.setOrigin(s.origin?.x ?? 0.5, s.origin?.y ?? 0.5);
      if (s.displayHeight) sprite.setScale(s.displayHeight / sprite.height);
      this.ensureAnims(s);
      return sprite;
    }
    const p = s.placeholder;
    const shape =
      p.shape === 'circle'
        ? this.scene.add.ellipse(x, y, p.width, p.height, p.color)
        : this.scene.add.rectangle(x, y, p.width, p.height, p.color);
    shape.setOrigin(s.origin?.x ?? 0.5, s.origin?.y ?? 0.5);
    return shape;
  }

  private ensureAnims(s: SkinDef): void {
    for (const [state, clip] of Object.entries(s.clips ?? {})) {
      if (!clip) continue;
      const key = animKey(s, state as AnimationState);
      if (this.scene.anims.exists(key)) continue;
      this.scene.anims.create({
        key,
        frames: clip.frames.map((frame) => ({ key: s.assetKey!, frame })),
        frameRate: clip.fps,
        repeat: clip.loop ? -1 : 0,
      });
    }
  }

  private applyFacing(): void {
    const imageFacesRight = (this.skin.facing ?? 'right') === 'right';
    const flip = this.facingRight !== imageFacesRight;
    if (this.body instanceof Phaser.GameObjects.Sprite) this.body.setFlipX(flip);
    else this.body.setScale(flip ? -1 : 1, 1);
  }
}
