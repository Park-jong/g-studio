import { SkinRegistry } from './SkinRegistry';
import type { AssetDef, SkinDef } from './skinTypes';

/**
 * 이미지 파일 등록. 파일은 public/assets/characters/<분류>/<종류ID>/<스킨ID>/ 아래에 둔다.
 * 예:
 *   { key: 'hero.player.summer', type: 'spritesheet', url: 'assets/characters/hero/player/summer/sheet.png', frameWidth: 128, frameHeight: 128 },
 * url은 앞에 /를 붙이지 않는다 (GitHub Pages 하위 경로에서 깨짐).
 */
export const ASSETS: AssetDef[] = [];

/**
 * 스킨 등록. 대상마다 default가 있어야 한다. 이미지가 생기면 assetKey와 clips를 추가한다.
 * 예:
 *   { subjectKey: 'hero:player', skinId: 'summer', name: '여름 의상',
 *     placeholder: { shape: 'rect', color: 0xffb347, width: 40, height: 56 },
 *     assetKey: 'hero.player.summer', facing: 'right', origin: { x: 0.5, y: 1 }, displayHeight: 96,
 *     clips: { idle: { frames: [0, 1], fps: 4, loop: true }, walk: { frames: [2, 3, 4, 5], fps: 10, loop: true } } },
 */
export const SKINS: SkinDef[] = [
  {
    subjectKey: 'hero:player',
    skinId: 'default',
    name: '기본',
    placeholder: { shape: 'rect', color: 0x6fa8ff, width: 40, height: 56 },
  },
  {
    subjectKey: 'hero:player',
    skinId: 'alt',
    name: '예시 스킨 (이미지 준비 중)',
    placeholder: { shape: 'circle', color: 0xffb347, width: 48, height: 48 },
  },
];

export function createSkinRegistry(): SkinRegistry {
  return new SkinRegistry(ASSETS, SKINS);
}
