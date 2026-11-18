import Phaser from 'phaser';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, ORIENTATION } from './config';
import { ORIENTATION_KEY, OrientationWatcher } from './core/orientation';
import { browserStorage } from './core/storage';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';
import { SESSION_KEY, Session } from './session';
import { createSkinRegistry } from './skins/skins';

const session = new Session(browserStorage(), createSkinRegistry(), window.location.search);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 멀티터치: 이동 버튼을 누른 채 다른 버튼을 누를 수 있게 포인터를 늘린다
  input: { activePointers: 4 },
  scene: [BootScene, TitleScene, GameScene],
  callbacks: {
    preBoot: (g) => g.registry.set(SESSION_KEY, session),
  },
});

// 의도와 다른 화면 방향이면 회전 안내를 띄운다. 씬은 같은 객체를 구독해 일시정지할 수 있다
const notice = document.getElementById('rotate-notice');
const orientation = new OrientationWatcher(ORIENTATION, () => ({ width: window.innerWidth, height: window.innerHeight }));
const showNotice = (wrong: boolean) => {
  if (notice) notice.style.display = wrong ? 'flex' : 'none';
};
orientation.subscribe(showNotice);
showNotice(orientation.isWrong);
game.registry.set(ORIENTATION_KEY, orientation);
window.addEventListener('resize', () => orientation.refresh());
window.addEventListener('orientationchange', () => orientation.refresh());

// 길게 누름 메뉴, 두 손가락 확대(iOS)를 막는다
window.addEventListener('contextmenu', (e) => e.preventDefault());
for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(name, (e) => e.preventDefault());
}
