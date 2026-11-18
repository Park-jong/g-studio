/** 게임 해상도 (Scale.FIT으로 화면에 맞춘다). 세로 게임이면 값을 바꾸고 ORIENTATION을 'portrait'로 둔다 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** 의도한 화면 방향. 반대 방향이면 회전 안내를 띄운다 */
export const ORIENTATION: 'landscape' | 'portrait' = 'landscape';

export const BACKGROUND_COLOR = '#1b1d26';

/** localStorage 키 접두사. 같은 도메인(github.io)의 다른 게임과 겹치지 않게 게임 ID를 쓴다 */
export const STORAGE_PREFIX = '__GAME_ID__';
