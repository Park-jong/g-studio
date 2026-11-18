# 아트 명세 템플릿

## A. 공통 규격 (`docs/art/README.md`)

```markdown
# 캐릭터 이미지 제작 가이드

## 공통 규격
- 형식: PNG, 투명 배경, sRGB
- 프레임: 정사각형 <128|256>px, 가로 스프라이트 시트(왼쪽→오른쪽) 또는 프레임별 파일
- 기준점: 발 중앙 (origin x 0.5, y 1). 발 아래 여백 <N>px 고정
- 방향: 원본은 오른쪽을 바라본다 (왼쪽은 코드에서 반전)
- 화면 표시 높이: 일반 <N>px, 보스 <N>px
- 위치: public/assets/characters/<분류>/<id>/<skinId>/<동작>.png
- 동작별 프레임 수(권장): idle 2~4, walk 4~6, attack 3~5, hit 1~2, death 3~4

## 공통 스타일 프롬프트
<그림체, 시점, 선, 채색, 조명 — 모든 캐릭터 프롬프트 앞에 붙인다>
예: "2D game sprite, side view facing right, full body, clean outline, flat cel shading, transparent background, no text"

## 색 규칙
<design.md 8장의 태그 색>

## 제작 순서
1. 주인공 default → 2. 대표 아군 1 → 3. 대표 적 1 → 4. 나머지 → 5. 보스 → 6. 추가 스킨

## 목록
| 분류 | id | 이름 | 명세 | 상태 |
```

## B. 캐릭터별 명세 (`docs/art/<분류>/<id>.md`)

```markdown
# <이름> (`<분류>:<id>`)

## 역할과 인상
- 게임에서의 역할 한 줄, 플레이어가 한눈에 알아봐야 할 특징

## 외형
- 실루엣: (작은 크기에서도 구분되는 형태)
- 팔레트: 주색 #......, 보조색 #......, 강조색 #......
- 소품·장식:

## 동작별 파일
| 동작 | 파일 | 프레임 | fps | 반복 | 연출 메모 |
| idle | idle.png | 2 | 4 | 예 | |
| walk | walk.png | 4 | 10 | 예 | |
| attack | attack.png | 4 | 12 | 아니오 | 3번째 프레임이 타격 시점 |
| hit | hit.png | 1 | – | 아니오 | |
| death | death.png | 3 | 8 | 아니오 | |

## 이미지 생성 프롬프트
- 기본: <공통 스타일> + <이 캐릭터 문구>
- 동작별: walk — "...", attack — "..."
- 피할 것(negative): ...

## 추가 스킨 콘셉트
1. `<skinId>` <이름>: 한 줄 설명, 바뀌는 색·소품
2. ...
```
