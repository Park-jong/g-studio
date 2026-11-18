# Changelog

## [0.2.1] - 2026-11-19
### Changed
- new-game이 만드는 진행 체크리스트를 단계 번호순(1~8)으로 바꿈. 배포 설정(7)은 줄 위치와 상관없이 3단계 직후 권장
- 기존 TODO.md의 체크리스트가 번호순이 아니면 new-game이 상태는 그대로 두고 줄 순서만 고침

## [0.2.0] - 2026-11-18
### Breaking
- 플러그인 이름을 gamemanager에서 gamestudio로 바꿈. 스킬·에이전트 이름은 `gamestudio:`로, 요청 도구는 `mcp__gamestudio__route_request`·`mcp__gamestudio__update_request`로 바뀜. 설치했다면 `gamemanager@gamemanager`를 지우고 `gamestudio@gamestudio`로 다시 설치

### Changed
- TODO.md의 예전 `## gamemanager 진행` 섹션도 new-game이 새 이름으로 바꿔 이어서 진행
- 대시보드 이름이 control_room으로 바뀐 것을 README에 반영

## [0.1.0] - 2026-11-18
### Added
- 게임 개발 조직: 총괄 디렉터(메인 세션) → 기획·개발·콘텐츠·QA 팀장 → 팀원 14명, 사용자 전용 Fable 3D 모델러
- 호출 규칙과 역할별 모델 고정, 조직도 패널·상태줄·완료 알림
- 타 팀 요청 기록과 우선순위(P0~P3), 팀별 로드맵·업무 기록·요청함
- 웹게임 개발 흐름 스킬: 장르·콘셉트, 프로토타입, 스택·뼈대(Phaser 4 템플릿), 게임 설정, 단계 계획, 개발 사이클, 배포 설정, 스킨 확장
- 개발 사이클: 작업 명세(무엇·어떻게·왜)와 사전 검토 → 개발 팀 구현 → QA 팀 검증(가벼운 검증 / 전체 검증), 최대 3사이클
- 검증 문제 기록: 반복된 문제를 재발 방지 규칙으로 합치고 ⚠️·🚨로 강조, 프로그래머가 코드를 쓰기 전에 자동으로 안내
- 버전 판단·CHANGELOG·확인 후 커밋, push하면 GitHub Pages 배포 결과 확인
- 대시보드용 세션별 조직 현황 파일(`.dev-team/live/`)
