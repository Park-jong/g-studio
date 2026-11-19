---
name: scaffold
description: gamestudio 3단계. 사용할 기술 스택을 정하고(기본 Phaser 4 + TypeScript + Vite + vitest), 스타터 템플릿을 복사해 프로젝트 뼈대·CLAUDE.md·git 저장소를 만든다. "프로젝트 세팅해줘", "뼈대 만들어줘", "스택 정하자", "/scaffold"처럼 요청할 때, 또는 next가 3단계로 안내할 때 사용.
---

# scaffold

이 스킬 폴더의 `template/`을 현재 프로젝트 폴더에 복사해 바로 실행 가능한 뼈대를 만든다. 템플릿에 들어 있는 것:

- `src/core/`: 시드 RNG, `SaveStore`(localStorage + 필드 단위 보정), URL 디버그 파라미터, 화면 방향 감시
- `src/skins/`: 스킨 등록부·선택·`CharacterView` (이미지 없으면 도형, 있으면 Sprite). 8단계에서 확장
- `src/scenes/`: Boot → Title → Game(데모), `src/session.ts`: 씬 공용 서비스
- `CLAUDE.md`, `.gitignore`, `index.html`(모바일 확대·스크롤 방지, 회전 안내), 테스트 15개

## 1. 스택 결정

`docs/design.md`를 읽고 아래 기준으로 추천한 뒤, 사용자에게 한 번 확인한다.

| 게임 | 추천 | 템플릿 사용 방식 |
|---|---|---|
| 2D 게임 대부분 (퍼즐, 슈팅, 디펜스, 카드, 액션) | **Phaser 4 + TS + Vite + vitest** (기본) | 그대로 사용 |
| 3D 공간이 핵심인 게임 | Three.js + TS + Vite + vitest | `src/core/`, `src/skins/skinTypes.ts·SkinRegistry.ts·SkinSelection.ts`, `session.ts`, 설정 파일은 그대로 쓰고, `phaser` 의존성·`scenes/`·`CharacterView.ts`를 Three.js용으로 바꾼다 |
| UI 위주 (카드 목록·텍스트가 대부분) | Phaser 기본 유지 또는 DOM+TS | 바꿀 때는 사용자와 범위를 정한다 |

추가 라이브러리(물리 엔진, 상태 관리, 사운드 등)는 필요한 이유가 design.md에 있을 때만 제안한다.

## 2. 복사

1. 현재 폴더 상태를 확인한다. `package.json`, `src/`, `index.html` 중 하나라도 이미 있으면 덮어쓰지 말고, 겹치는 파일 목록을 보여주고 어떻게 할지 묻는다. (`TODO.md`, `docs/`, `prototype/`는 그대로 둔다.)
2. `template/`의 모든 파일(숨김 파일 `.gitignore` 포함)을 프로젝트 루트로 복사한다.
3. 자리표시자 바꾸기 (모든 텍스트 파일):
   - `__GAME_ID__` → 영문 소문자·하이픈 ID (예: `my-game`). package 이름, localStorage 키 접두사, 저장소 이름 후보로 쓴다.
   - `__GAME_TITLE__` → 가제 (design.md 1장)
   - `__GAME_PITCH__` → design.md의 한 줄 소개
4. 세로 게임이면 `src/config.ts`의 `GAME_WIDTH/GAME_HEIGHT`를 바꾸고 `ORIENTATION = 'portrait'`, `index.html` 회전 안내 문구를 "세로로"로 바꾼다.
5. **포트 확인** — 사용자가 동시에 띄우는 다른 프로젝트와 포트가 겹치는지 묻거나, 같은 상위 폴더의 다른 게임 `vite.config.*`·`CLAUDE.md`에서 쓰는 포트를 확인한다. 겹치면 `vite.config.ts`에 `server: { port: N, strictPort: true }`를 넣고 CLAUDE.md 명령어 표에 적는다.
6. `docs/` 폴더가 없으면 만든다. 검증 문제 기록(`docs/verification-issues.md`)은 첫 dev-cycle이 만든다.

## 3. 확인

1. `npm install` → `npm run typecheck` → `npm test` → `npm run build`를 실행해 모두 통과하는지 확인한다.
2. 가능하면 `npm run dev`로 띄워 브라우저에서 타이틀 → 게임 화면, 방향키 이동, K 키 스킨 변경을 확인한다.
3. git 저장소가 아니면 `git init -b main` 후, 사용자 확인을 받아 첫 커밋을 만든다 (`/gamestudio:commit-release` 규칙, 메시지 예: `🔧 chore: Phaser 프로젝트 뼈대 추가`).

## 4. 마무리

- `TODO.md`의 `## gamestudio 진행` 3단계를 `[x]`로 바꾸고, 맨 위에 `기술 스택: ...` 한 줄과 실행 명령을 적는다.
- 보고: 스택, 만든 파일 요약, 실행한 검증 결과. 다음은 **`/gamestudio:deploy-setup`(배포 설정, 권장)** 또는 `/gamestudio:game-spec`이라고 알리고 멈춘다.

## 규칙

- 템플릿의 데모 화면(`GameScene`)은 6단계 첫 개발 단계에서 실제 화면으로 교체한다. 지금 지우지 않는다 (뼈대 동작 확인용).
- `prototype/`은 건드리지 않는다.
