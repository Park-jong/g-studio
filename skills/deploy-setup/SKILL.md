---
name: deploy-setup
description: gamemanager 7단계. GitHub 저장소와 GitHub Pages 자동 배포(main push → Actions가 테스트·빌드 → gh-pages 브랜치)를 설정한다. 이후 개발 단계마다 커밋·push만 하면 배포된다. "배포 설정해줘", "GitHub Pages 올려줘", "/deploy-setup"처럼 요청할 때, 또는 scaffold 직후 사용. 배포 상태 확인("배포 됐어?")에도 사용.
---

# deploy-setup

표준 배포 방식: **main에 push → GitHub Actions가 `npm ci` → `npm test` → `npm run build` → `dist/`를 `gh-pages` 브랜치에 강제 push → Pages가 서비스.** 테스트가 실패하면 배포되지 않는다. 워크플로 원본은 이 스킬 폴더의 `deploy.yml`이다.

원격에 올리는 작업(저장소 생성, push, Pages 설정)은 **각각 사용자 확인을 받은 뒤** 실행한다.

## 1. 사전 확인

1. `package.json`에 `test`, `build` 스크립트가 있고 `vite.config.*`에 `base: './'`가 있는지 확인한다. 없으면 추가한다 (하위 경로 `/<저장소>/`에서 에셋 경로가 깨지는 것 방지).
2. 코드 안의 에셋 경로가 `/assets/...`처럼 `/`로 시작하지 않는지 grep으로 확인한다. 있으면 `assets/...`로 고치자고 보고한다.
3. `npm test`와 `npm run build`가 로컬에서 통과하는지 확인한다. 실패하면 멈추고 보고한다 (배포 워크플로도 실패하므로).
4. 예전 방식(`gh-pages` npm 패키지, `predeploy`/`deploy` 스크립트)이 있으면 Actions 방식으로 바꿀지 묻는다. 바꾸면 스크립트와 `gh-pages` 의존성을 지운다.

## 2. 워크플로 추가

1. `deploy.yml`을 `.github/workflows/deploy.yml`로 복사한다. Node 버전은 그대로 두거나 `package.json`의 `engines`에 맞춘다.
2. 타이틀 화면에 버전이 보이는지 확인한다 (템플릿 `TitleScene`은 `package.json` 버전을 표시한다). 배포 후 어느 버전이 올라갔는지 눈으로 확인하는 용도다.

## 3. 저장소와 첫 배포 (각각 확인 후)

1. `git remote -v`로 원격이 있는지 본다. 없으면 `gh auth status`로 로그인을 확인하고 (안 되어 있으면 사용자에게 `! gh auth login`을 안내), 저장소 이름(기본: `__GAME_ID__`와 같은 package 이름)과 공개 여부를 확인한 뒤 `gh repo create <이름> --public --source . --remote origin`을 실행한다. (비공개 저장소의 Pages는 유료 플랜이 필요하다고 알린다.)
2. 워크플로 추가를 커밋한다 (`/gamemanager:commit-release` 규칙, 예: `🔧 chore: GitHub Pages 자동 배포 워크플로 추가`).
3. 사용자 확인 후 `git push -u origin main`.
4. `gh run watch` 또는 `gh run list --workflow deploy.yml -L 1`로 실행 결과를 확인한다. 실패하면 `gh run view --log-failed`로 원인을 보여준다.
5. **Pages 소스 설정** (처음 한 번): gh-pages 브랜치가 생긴 뒤, 확인을 받고 아래를 실행한다. 이미 설정되어 있으면 건너뛴다.
   ```
   gh api -X POST repos/{owner}/{repo}/pages -f "source[branch]=gh-pages" -f "source[path]=/"
   ```
   실패하면 웹에서 설정하도록 안내: Settings → Pages → Source "Deploy from a branch" → `gh-pages` / `(root)`.
6. 배포 주소 `https://<owner>.github.io/<repo>/`를 알려준다. 1~2분 뒤 열리는지 확인할 수 있으면 확인한다.

## 4. 기록

- `TODO.md`의 `## 현재 상태`에 `배포: <주소> (main push → Actions가 빌드해 gh-pages 브랜치에 올림)`을 적는다.
- `CLAUDE.md` 명령어 표 아래에 배포 방식 한 줄을 적는다.
- `TODO.md`의 `## gamemanager 진행` 7단계를 `[x]`로 바꾼다.

## 개발 단계마다 (6단계 중)

배포 설정이 끝난 뒤에는 단계가 끝날 때마다 아래 순서다. 이 스킬을 다시 부를 필요는 없다.

1. dev-cycle 통과 → 2. `/gamemanager:commit-release` (버전 MINOR 올림) → 확인 화면에서 **`커밋 후 push`** 선택 → commit-release가 push하고 Actions 배포 결과(성공/실패, 배포 주소)까지 확인 → `TODO.md` 완료 표에 버전·커밋 기록

## 배포 상태 확인 요청일 때

`gh run list --workflow deploy.yml -L 3`, 실패 시 `gh run view <id> --log-failed`, 그리고 배포 주소를 알려준다.
