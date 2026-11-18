import { defineConfig } from 'vite';

// base './': GitHub Pages 하위 경로(/<저장소>/)에서도 동작하도록 상대 경로로 빌드한다
// 포트: 다른 게임 프로젝트와 겹치면 server.port를 지정한다 (CLAUDE.md에 기록)
export default defineConfig({
  base: './',
  // Phaser 번들은 1MB가 넘는 것이 정상이라 경고 기준을 올린다
  build: { chunkSizeWarningLimit: 2000 },
});
