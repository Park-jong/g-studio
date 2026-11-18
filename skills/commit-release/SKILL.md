---
name: commit-release
description: 사용자가 "커밋해줘", "커밋 해", "commit 해줘", "커밋하고 배포해줘"처럼 실제 커밋을 요청할 때 사용. version 스킬 규칙으로 올릴 버전을 판단하고 commit 스킬 규칙으로 메시지를 만든 뒤, 사용자 확인을 받고 버전 파일·CHANGELOG 갱신과 함께 커밋한다. 확인 화면에서 "커밋 후 push(=배포)"를 고르면 push하고 GitHub Actions 배포 결과까지 확인한다. 태그는 하지 않는다. 메시지만 원하면 /commit, 버전만 원하면 /version을 쓴다.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git tag --list:*), Bash(git describe:*), Bash(git add:*), Bash(git commit:*), Bash(git remote:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git fetch:*), Bash(git push:*), Bash(gh run:*), Read, Edit, Write, Glob, Grep
---

# commit-release

버전 판단과 커밋 메시지 생성을 묶어 **확인을 받은 뒤 실제로 커밋**하고, 사용자가 고르면 **push까지 해서 배포**한다.
세부 규칙은 두 스킬 파일을 그대로 따른다. 이 파일은 순서와 예외만 정한다.

- 버전 규칙: 이 스킬 폴더의 형제 폴더 `../version/SKILL.md` (gamemanager 플러그인의 version 스킬)
- 메시지 규칙: 형제 폴더 `../commit/SKILL.md` (gamemanager 플러그인의 commit 스킬)

시작할 때 두 파일을 읽는다. 둘이 충돌하면 이 파일의 내용이 우선한다.

## 절차

1. **사전 확인** — `git status`로 git 저장소인지와 변경이 있는지 확인한다. 저장소가 아니거나 변경이 없으면 그 사실을 알리고 멈춘다.
   - push 가능 여부도 함께 파악한다: `git remote -v`(원격 있음?), `git rev-parse --abbrev-ref HEAD`(현재 브랜치), `git rev-parse --abbrev-ref @{u}`(업스트림, 없으면 오류), `.github/workflows/deploy.yml` 존재 여부(push = 배포인지).

2. **버전 판단 (파일은 아직 수정하지 않음)** — version 스킬의 절차 1~4로 현재 버전, 비교 기준점, 올릴 단계를 정한다. 사용자가 단계나 버전을 함께 말했으면(예: "minor로 올려서 커밋해줘") 그것을 따른다.
   - '올리지 않음'이면 버전·CHANGELOG 없이 커밋만 진행한다.
   - 단계가 애매하면 후보와 근거를 확인 단계에서 함께 보여주고 고르게 한다.

3. **메시지 생성** — commit 스킬 규칙으로 메시지를 만든다. 버전을 올리는 경우 본문 마지막 불릿에 `- VERSION: <이전> → <새 버전>` (실제 버전 파일 이름 사용)과 `- CHANGELOG.md: <새 버전> 항목 추가`를 넣는다.
   - 변경이 여러 목적으로 섞여 있으면 commit 스킬처럼 나눠 제안하되, 버전 반영은 마지막 커밋 하나에만 포함한다.

4. **확인 받기** — 아래 내용을 보여주고 사용자 답을 기다린다. 승인 전에는 어떤 파일도 수정하거나 스테이징하지 않는다.
   - 버전: `<이전> → <새 버전>` (단계와 근거 한 줄), 또는 "버전 변경 없음"
   - 추가할 CHANGELOG 항목 미리보기
   - 커밋 메시지 (코드 블록)
   - 커밋에 포함할 파일 목록과 제외할 파일(경고 대상)

   그다음 AskUserQuestion으로 **진행 방식**을 묻는다.
   - 원격이 있으면 선택지: `커밋 후 push` / `커밋만` / `수정 요청`(Other로 입력) / `취소`.
     - `deploy.yml`이 있고 현재 브랜치가 워크플로의 배포 브랜치(보통 `main`)면, `커밋 후 push` 선택지 설명에 **"push하면 GitHub Pages에 배포됩니다"**라고 적고 이 선택지를 첫 번째(추천)로 둔다.
     - 배포 브랜치가 아니면 "push만 되고 배포는 되지 않음"이라고 적는다.
   - 원격이 없으면 push 선택지를 빼고, push하려면 `/gamemanager:deploy-setup`으로 원격을 먼저 만들라고 한 줄로 알린다.
   - 사용자가 처음 요청에서 이미 "커밋하고 푸시해줘", "커밋하고 배포해줘"라고 했으면 그 선택을 기본으로 표시하되, 확인 질문은 생략하지 않는다.

   사용자가 수정을 요청하면 반영해서 다시 보여주고, 취소하면 아무것도 바꾸지 않고 멈춘다.

5. **반영 및 커밋** — 승인되면:
   1. version 스킬의 절차 5로 버전 파일과 `CHANGELOG.md`를 갱신한다.
   2. 확인받은 파일만 `git add <파일...>`로 스테이징한다 (`git add -A`, `git add .` 사용 금지). 경고 대상 파일(`.claude/settings.local.json`, `.env` 등 비밀 값, `node_modules/`, 빌드 산출물, 로그)은 제외한다.
   3. 확인받은 메시지 그대로 `git commit`한다. 여러 줄 메시지는 heredoc 또는 `-F`로 전달한다.
   4. pre-commit 훅이 실패하면 `--no-verify`로 우회하지 말고, 실패 내용을 보여주고 멈춘다 (push도 하지 않는다).

6. **보고** — `git log -n 1 --stat`로 만들어진 커밋을 확인해 해시, 제목, 새 버전을 알려준다.

7. **TODO.md 기록 (gamemanager 프로젝트)** — `TODO.md`의 완료 표에 이번 단계의 `버전 해시`(예: `0.3.0 abc1234`)를 적고 `## 현재 상태`의 버전을 갱신한다. 이 수정은 다음 커밋에 포함된다고 알려준다 (해시를 커밋 안에 넣을 수 없으므로).

8. **push (4단계에서 `커밋 후 push`를 고른 경우만)**
   1. 업스트림이 있으면 `git push`, 없으면 `git push -u origin <현재 브랜치>`.
   2. 거부되면(원격에 새 커밋이 있음 등) **pull·rebase·force로 해결하지 말고** 오류 내용을 보여주고 멈춘다. 커밋은 로컬에 그대로 남아 있다고 알린다.
   3. 인증 오류면 `! gh auth login`을 안내하고 멈춘다.

9. **배포 확인 (push했고 `deploy.yml`이 있고 배포 브랜치인 경우)**
   1. `gh run list --workflow deploy.yml -L 1 --json databaseId,headSha,status`로 방금 커밋(`headSha`가 새 해시)의 실행을 찾는다. 아직 안 보이면 몇 초 뒤 한 번 더 확인한다.
   2. `gh run watch <id> --exit-status`로 끝날 때까지 기다린다 (보통 1~3분).
   3. 성공: 배포 주소(`TODO.md`의 `배포:` 줄, 없으면 `https://<owner>.github.io/<repo>/`)와 "1~2분 뒤 타이틀 화면에 `v<새 버전>`이 보이면 반영 완료"를 알린다.
   4. 실패: `gh run view <id> --log-failed`에서 실패한 단계(npm ci / test / build / push)와 핵심 오류 몇 줄을 보여준다. 테스트·빌드 실패면 배포되지 않았고 사이트는 이전 버전 그대로라고 알린다. 고치는 작업은 사용자 지시를 기다린다.
   5. `gh`가 없거나 로그인이 안 되어 확인할 수 없으면 그렇다고 알리고 Actions 탭 주소를 안내한다.

## 두 스킬 규칙에 대한 예외

- commit·version 스킬의 '금지' 항목 중 `git add`와 `git commit`은 이 스킬에서, 4단계의 사용자 승인 뒤에만 허용한다.
- `git push`는 4단계에서 사용자가 `커밋 후 push`를 고른 경우에만, 8단계에서 한 번 허용한다.
- 메시지에 `Co-Authored-By` 등 attribution 줄을 넣지 않는 commit 스킬 규칙은 그대로 지킨다.

## 금지

- `git push --force`/`-f`/`--force-with-lease`, `git pull`, `git reset`, `git commit --amend`, `git rebase` 실행 금지.
- `git tag` 금지. 태그가 필요하면 `git tag v<새 버전>` 명령을 안내만 한다.
- 사용자 승인 없이 파일 수정·스테이징·커밋·push 금지. 이전 대화에서 push를 승인했어도 이번 커밋에 대해 다시 묻는다.
