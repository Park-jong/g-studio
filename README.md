# gamemanager

게임 개발 조직(총괄 디렉터 → 팀장 → 팀원)과 웹게임 개발 흐름(콘셉트 → 프로토타입 → 뼈대 → 설정 → 계획 → 개발 사이클 → 배포 → 스킨)을 하나로 묶은 Claude Code 플러그인입니다. 기존 `dev-team`(조직·기록·패널)과 `gamekit`(단계별 스킬·Phaser 템플릿·검증 루프)을 합쳤습니다.

- **총괄 디렉터는 메인 세션**입니다. 팀장에게 일을 맡기고, 전체 로드맵(`TODO.md`)과 타 팀 요청의 우선순위를 관리합니다.
- 장르와 엔진은 고정되어 있지 않습니다. 새 웹게임은 기본으로 Phaser 4 + TypeScript + Vite 템플릿을 씁니다.

## 개발 흐름 (스킬)

| 단계 | 스킬 | 산출물 |
|---|---|---|
| 진입점 | `/gamemanager:new-game` | 진행 상태 확인, 다음 단계 안내 |
| 1. 장르·콘셉트 | `/gamemanager:game-concept` | `docs/design.md` 1~2장 |
| 2. 프로토타입 | `/gamemanager:prototype` | `prototype/index.html` |
| 3. 스택·뼈대 | `/gamemanager:scaffold` | Phaser 4 + TS + Vite 프로젝트 (템플릿 복사) |
| 7. 배포 설정 | `/gamemanager:deploy-setup` | GitHub Actions → gh-pages (3단계 직후 권장) |
| 4. 게임 설정 | `/gamemanager:game-spec` | `docs/design.md` 3장~, `docs/numbers.md` |
| 5. 단계 계획 | `/gamemanager:roadmap` | `TODO.md` (전체 로드맵) |
| 6. 개발 | `/gamemanager:dev-cycle` | 개발 팀 구현 → QA 팀 검증·피드백 (최대 3사이클) |
| 커밋 | `/gamemanager:commit-release`, `/gamemanager:commit`, `/gamemanager:version` | 버전·CHANGELOG·커밋, 확인 화면에서 고르면 push(=배포)와 Actions 결과 확인 |
| 8. 스킨 확장 | `/gamemanager:skin-system` | `docs/skins.md`, `docs/art/`, 스킨 등록·선택·이미지 적용 |

사용자와 정해야 하는 결정(장르, 콘셉트, 규칙, 수치)은 메인 세션이 스킬로 직접 묻습니다. 팀장과 팀원은 백그라운드로 일해서 사용자에게 물을 수 없기 때문입니다.

## 명령어

- `/dev-team <작업 내용>`: 메인 세션이 총괄 디렉터로서 조직에 일을 맡깁니다(`guides/director.md`, 코드 작업이면 dev-cycle 절차도 따름). 작업 중에도 메인 세션과 대화하거나 "멈춰 줘"로 중단할 수 있습니다.
- `/dev-team`: 조직 현황 패널만 엽니다.
- `/dev-team-status [팀]`: 맡긴 작업, `TODO.md` 현재 상태, 진행 중인 역할, 팀별 할 일, 열린 타 팀 요청. `design`·`tech`·`content`·`qa`를 붙이면 그 팀 상세.
- `/dev-team-fable <요청>`: 사용자 전용 Fable 3D 모델러에게 작업을 맡깁니다.

## 조직

```
총괄 디렉터 = 메인 세션 (지침: guides/director.md)
├ 기획 팀장 (design-lead)    ─ 시스템 기획 · 레벨 디자이너 · 밸런스 기획
├ 개발 팀장 (tech-lead)      ─ 클라이언트 · 서버 · 툴/빌드 · 엔진/최적화
├ 콘텐츠 팀장 (content-lead) ─ 시나리오 작가 · 아트 디렉터 · 3D 모델러 · 3D 모델 관리 · 사운드 기획
└ QA 팀장 (qa-lead)          ─ 테스터 · 코드 리뷰어  (+ 검증 판정·수정 지시·검증 문제 기록)
사용자 전용: Fable 3D 모델러 (fable-modeler) ─ 사용자가 직접 요청했을 때만 동작
```

| 호출하는 쪽 | 부를 수 있는 agent (agent.spawn hook이 강제) |
| --- | --- |
| 메인 세션 (총괄 디렉터) | 팀장 4명, Fable 3D 모델러(사용자 요청 시에만) |
| 팀장 | 자기 팀 팀원 |
| 팀원, 조직 밖 agent | 없음 |

모든 호출은 백그라운드로 실행됩니다. 팀장은 팀원 결과가 모두 올 때까지 최종 보고를 하지 않고(패널에 "팀원 결과 대기"), 메인 세션은 팀장의 완료 알림을 받은 뒤 다음 팀에 넘깁니다.

**화면**: 조직도 패널(역할별 ○ 대기 / ◐ 진행 중 / ● 완료 / ✕ 실패, 회차, QA 판정, 팀별 받은 요청), 상태 표시줄(가장 아래 단계에서 일하는 역할), 완료 알림.

### 역할별 모델

agent 정의의 `model`과 hook 양쪽에 지정되어, 호출하는 쪽이 다른 모델을 넘겨도 고정됩니다.

| 모델 | 역할 |
| --- | --- |
| Opus | 클라이언트, 서버, 엔진/최적화, 3D 모델러, 코드 리뷰어 |
| Sonnet | 팀장 4명, 시스템 기획, 레벨 디자이너, 밸런스 기획, 툴/빌드, 시나리오 작가, 아트 디렉터, 3D 모델 관리, 테스터 |
| Haiku | 사운드 기획 |
| Fable | Fable 3D 모델러 (사용자 전용, 조직 밖) |

### 사용자 전용 Fable agent

일반 3D 모델 작업은 콘텐츠 팀의 3D 모델러가 하고, `gamemanager:fable-modeler`는 사용자가 `/dev-team-fable <요청>`을 쓰거나 메시지에 "fable"/"페이블"을 넣었을 때만 동작합니다. 허가는 그 메시지에 대한 응답 동안만 유효하고, 팀장이나 다른 agent가 부르면 항상 거부됩니다.

## 코드 작업 (dev-cycle)

1. 메인 세션이 **작업 명세**(무엇·어떻게·왜·범위 밖·검증 강도)와 **사전 검토**(이대로 하면 생길 문제와 대안)를 정합니다. 무엇·왜가 불분명하면 먼저 묻습니다.
2. **개발 팀장**이 프로그래머에게 나눠 구현합니다. hook이 프로그래머 프롬프트에 공통 지침(`guides/programmer-guide.md`: 작업 규칙, 객체지향·SOLID·클린 코드)과 검증 문제 기록 안내(🚨 규칙 포함)를 붙입니다.
3. **QA 팀장**이 검증 강도에 맞춰 검증하고, `Verdict: APPROVED` / `CHANGES REQUESTED`, 근본 원인, 수정 지시(무엇·어떻게·왜)를 보고하며 `docs/verification-issues.md`를 갱신합니다.
   - **light**(기본: 버그 수정, 수치·문구 조정, 기존 구조 안의 작은 기능): QA 팀장이 팀원 없이 직접 검사 명령을 돌리고 diff를 확인합니다.
   - **full**(새 시스템·화면, 구조 변경, 저장 형식·네트워크·보안, 단계의 마지막 항목): 테스터와 코드 리뷰어(diff 중심)를 병렬로 부릅니다.
4. 수정 요청이면 수정 지시를 개발 팀장에게 넘겨 반복합니다. 2·3번째 사이클은 지적된 항목과 회귀 테스트만 확인합니다. 3번째 사이클도 수정 요청이면 멈추고 선택지를 보고합니다.

기획 쪽에서는 밸런스 기획이 계산표로 근거를 남기고, **시뮬레이션은 사용자가 요청했을 때만** 돌립니다(예전 실행에서 기획 시간의 대부분이 시뮬레이션이었음).

**검증 문제 기록**(`docs/verification-issues.md`): 검증에서 나온 문제를 재발 방지 규칙으로 모읍니다. 같은 근본 원인은 하나로 합치고 횟수를 올리며, 2회 `⚠️`, 3회 이상 `🚨`(맨 위 "반드시 지킬 규칙")로 강조합니다. QA 팀장만 쓸 수 있습니다(hook이 강제).

## 기록

| 파일 | 내용 | 쓰기 권한 |
| --- | --- | --- |
| `TODO.md` | 전체 로드맵: 단계(=마일스톤), 현재 상태, 결정 대기, 코드가 정한 해석, 결정 기록 | 총괄 디렉터(메인 세션) |
| `docs/verification-issues.md` | 검증 문제 기록 | QA 팀장 |
| `.dev-team/teams/<팀>/roadmap.md` | 팀 로드맵 | 그 팀의 팀장 |
| `.dev-team/teams/<팀>/worklog.md` | 팀 업무 기록 | 그 팀의 팀장 |
| `.dev-team/teams/<팀>/inbox.md` | 팀이 받은 요청 | 자동 생성 (도구로만 변경) |
| `.dev-team/requests.md`, `requests.json` | 전체 요청 대장 | 자동 생성 (도구로만 변경) |

hook은 조직 상태가 바뀔 때마다 `.dev-team/live/<세션 id>.json`에도 현황을 남깁니다(git 제외, 세션이 끝나면 `ended: true`). 옆 폴더의 대시보드(`../dashboard`)가 이 파일로 진행 중인 조직도를 보여 줍니다.

`.dev-team/`은 `/dev-team`을 처음 실행하거나 팀장이 처음 호출될 때 자동으로 만들어집니다. 쓰기 권한은 Edit/Write hook이 강제합니다. 팀장은 자기 기록만 쓰고 산출물은 팀원에게 맡깁니다.

### 타 팀 요청

1. 팀원이 발견한 내용 → 팀장 보고의 `[Cross-team requests]`
2. 작업이 끝나면 메인 세션이 `TODO.md`의 현재 단계를 기준으로 우선순위를 정해 `route_request` 도구로 기록 (메인 세션 전용)
3. 받는 팀장이 다음 작업을 시작할 때 요청함을 읽고 `update_request`로 수락 → 처리 중 → 완료/반려. 우선순위 변경은 메인 세션만 가능

| 우선순위 | 기준 |
| --- | --- |
| P0 | 현재 단계를 막는 문제. 받는 팀이 다음 작업에 반드시 포함 |
| P1 | 현재 단계 안에 처리 |
| P2 | 다음 단계 |
| P3 | 개선 제안·백로그 (QA의 낮음 문제 포함) |

사용자가 "개발 팀에 ~ 요청해 줘"라고 말하면 `from: user`로 기록됩니다.

## 커밋

`/gamemanager:commit-release`가 유일한 커밋 경로입니다: 버전 판단 → 메시지 생성 → **사용자 확인** → 버전 파일·CHANGELOG 갱신과 커밋 → (고르면) push와 배포 확인. 메시지 형식은 `/gamemanager:commit` 규칙입니다.

```
✨ feat: 한글 제목

- 파일: 변경 내용
```

제목과 본문 사이에 빈 줄 한 줄, 제목·본문은 항상 한국어, `git add -A` 금지, 강제 push 금지. 프로젝트 지침(CLAUDE.md)에 커밋 형식 규칙이 있으면 그쪽 형식이 우선합니다.

## 언어

| 내용 | 언어 |
| --- | --- |
| agent 정의(`agents/*.md`), `guides/*.md`, 팀장·팀원 사이 지시와 보고 | 영어 (토큰 절약) |
| 스킬(`skills/*`), 메인 세션이 사용자에게 하는 말과 최종 보고 | 한국어 |
| `TODO.md`, `.dev-team/` 기록, `docs/verification-issues.md`, 패널, 알림 | 한국어 |
| 사용자가 읽는 문서 산출물(기획서 등) | 프로젝트의 기존 언어, 없으면 한국어 |
| 코드, 식별자, 코드 주석 | 프로젝트의 기존 관례, 없으면 영어 |
| 커밋 메시지 | 항상 한국어 (type 키워드·파일 경로·식별자만 그대로) |

## 구성

```
.claude-plugin/   plugin.json, marketplace.json, types/(엔진이 만드는 타입, git 제외)
agents/           팀장 4 · 팀원 14 · fable-modeler
guides/           director.md(총괄 디렉터 지침), programmer-guide.md(프로그래머·코드 리뷰어 공통 지침)
hooks/            hooks.json + register.tsx (조직 규칙, 모델 고정, 기록·요청 도구, 쓰기 권한, 지침 주입, 패널·상태줄·알림, 명령어)
skills/           위 표의 스킬들, scaffold/template/(Phaser 스타터 프로젝트)
types/            hook 모듈의 상태 타입
tests/            hook 모듈 테스트 (claude plugin test)
```

## 설치

같은 PC (로컬 경로):
```
/plugin marketplace add <이 폴더의 경로>
/plugin install gamemanager@gamemanager
```

다른 PC (GitHub에 올린 뒤):
```
/plugin marketplace add <owner>/<repo>
/plugin install gamemanager@gamemanager
```

수정 후 반영: `/plugin marketplace update gamemanager` 후 Claude Code 재시작. 개발 중에는 `claude --plugin-dir <이 폴더의 경로>`로 설치 없이 시험할 수 있습니다.

## 이전 플러그인에서 옮길 때

- `dev-team`·`gamekit` 플러그인은 비활성화하거나 지웁니다. 같이 켜 두면 같은 이름의 agent·스킬·명령어·hook이 두 벌 동작합니다. 프로젝트 `.claude/settings.json`의 `enabledPlugins`에 `dev-team@company-local`이 있으면 `gamemanager@gamemanager`로 바꿉니다.
- 프로젝트에 직접 넣어 둔 `.claude/agents`, `.claude/skills`(같은 이름)도 지웁니다.
- 기존 `.dev-team/` 기록(팀 로드맵·업무 기록·요청)은 그대로 이어서 씁니다. `.dev-team/roadmap.md`가 있으면 총괄 디렉터가 처음 작업할 때 내용을 `TODO.md`로 옮깁니다.
- `TODO.md`의 `## gamekit 진행` 섹션은 `/gamemanager:new-game`이 `## gamemanager 진행`으로 이름을 바꿉니다.
- 없어진 것: `committer` agent와 `/dev-team-commit`(→ `/gamemanager:commit-release`), `code-writer`·`code-verifier`·`feedback-synthesizer`(→ 개발 팀·QA 팀), `TODO.md`의 `낮음 문제` 목록(→ 타 팀 요청).

## 수정할 때

- hook 모듈: `claude plugin validate .`, 타입 검사 `tsc -p .`. `claude plugin test .`은 템플릿의 vitest 파일(`skills/scaffold/template/**/*.test.ts`)까지 잡아 실패하므로, `skills/`를 뺀 복사본에서 `tests/`만 돌립니다.
- 템플릿(`skills/scaffold/template`): 임시 폴더에 복사해 `npm install && npm run typecheck && npm test && npm run build`로 확인합니다.
