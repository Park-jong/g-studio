---
name: new-game
description: gamestudio 웹게임 개발 흐름의 진입점. 새 웹게임을 시작하거나("새 게임 만들자", "/new-game"), 진행 중인 gamestudio 프로젝트에서 "다음 뭐 하지", "지금 어디까지 했지"라고 물을 때 사용. 현재 폴더의 TODO.md에서 진행 단계를 읽어 다음 단계 스킬로 안내한다.
---

# new-game

gamestudio는 웹게임을 아래 8단계로 만든다. 이 스킬은 **지금 몇 단계인지 확인하고 다음 단계 스킬을 실행**하는 조율 역할만 한다. 각 단계의 세부 절차는 해당 스킬이 정한다.

| 단계 | 스킬 | 산출물 |
|---|---|---|
| 1. 장르·콘셉트 | `/gamestudio:game-concept` | `docs/design.md` 1~2장 (콘셉트, 핵심 루프) |
| 2. 프로토타입 | `/gamestudio:prototype` | `prototype/index.html` (의존성 없는 단일 파일) |
| 3. 스택·뼈대 | `/gamestudio:scaffold` | Phaser 4 + TS + Vite 프로젝트, `CLAUDE.md`, git 저장소 |
| 4. 게임 설정 | `/gamestudio:game-spec` | `docs/design.md` 나머지 장, `docs/numbers.md` |
| 5. 단계 계획 | `/gamestudio:roadmap` | `TODO.md` 작업 목록 (개발 단계 세분화) |
| 6. 개발 | `/gamestudio:dev-cycle` (단계마다 반복, 개발 팀 → QA 팀) | 코드 + 테스트, 단계마다 커밋(`/gamestudio:commit-release`) |
| 7. 배포 | `/gamestudio:deploy-setup` (3단계 직후 1회 설정, 이후 단계마다 자동) | GitHub Actions → gh-pages |
| 8. 스킨 확장 | `/gamestudio:skin-system` | `docs/skins.md`, 스킨 등록·선택 화면, 이미지 적용 |

기획·아트·사운드까지 걸친 큰 작업은 어느 단계에서든 `/dev-team <작업>`으로 조직(기획·개발·콘텐츠·QA 팀)에 맡길 수 있다. `TODO.md`는 그 조직의 전체 로드맵으로도 쓰인다.

배포 설정(7)은 뼈대(3)가 생긴 직후에 한 번 해 두는 것을 권장한다. 그러면 6단계의 개발 단계가 끝날 때마다 `/gamestudio:commit-release`에서 `커밋 후 push`를 고르는 것만으로 배포된다.

## 절차

1. **상태 확인** — 현재 폴더에서 `TODO.md`를 찾는다.
   - 있고 `## gamestudio 진행` 섹션(예전 이름 `## gamemanager 진행`·`## gamekit 진행`이면 이름을 바꾼다)이 있으면: 체크 상태를 읽어 완료된 단계와 다음 단계를 한 줄씩 보고하고, 다음 단계 스킬을 실행할지 묻는다. 6단계 중이면 `TODO.md` 작업 목록에서 다음 `[ ]` 항목을 알려준다.
   - `TODO.md`는 있는데 진행 섹션이 없으면(`/dev-team`으로 먼저 시작한 프로젝트 등) 내용을 보존한 채 아래 체크리스트를 제목 바로 아래에 넣고, 이미 끝난 단계는 `[x]`로 표시한다.
   - `TODO.md`가 없으면 새 게임이다. 폴더가 비어 있지 않으면 어떤 파일이 있는지 보여주고 이 폴더에서 시작할지 확인한다. 다른 게임 프로젝트 안이면 새 폴더를 만들지 묻는다.
2. **새 게임이면** `TODO.md`를 아래 내용으로 만들고 `/gamestudio:game-concept`를 실행한다.

```markdown
# (가제 미정) 작업 목록

## gamestudio 진행
- [ ] 1. 장르·콘셉트 (`docs/design.md` 1~2장)
- [ ] 2. 프로토타입 (`prototype/index.html`)
- [ ] 3. 스택·뼈대
- [ ] 4. 게임 설정 (`docs/design.md`, `docs/numbers.md`)
- [ ] 5. 단계 계획 (아래 작업 목록)
- [ ] 6. 개발 (작업 목록의 단계를 dev-cycle로)
- [ ] 7. 배포 설정 (3단계 직후 권장)
- [ ] 8. 스킨 확장
```

3. 각 단계 스킬은 끝날 때 이 체크리스트의 해당 줄을 `[x]`로 바꾼다. 체크리스트 줄은 진행 순서와 상관없이 단계 번호순(1~8)으로 둔다. 기존 `TODO.md`의 줄이 번호순이 아니면 상태와 메모는 그대로 두고 줄 순서만 번호순으로 고친다. 사용자가 단계를 건너뛰자고 하면 `[-] (건너뜀: 이유)`로 표시한다.

## 규칙

- 한 번에 한 단계만 진행한다. 단계가 끝나면 결과를 보고하고 멈춘다 (다음 단계를 자동으로 시작하지 않는다).
- 순서는 권장일 뿐이다. 사용자가 다른 단계부터 하자고 하면 따르되, 앞 단계 산출물이 없어 생기는 문제(예: 설계 없이 계획)를 한 줄로 알린다.
