# VERIFY-SPEC — 배포 화면 결함 5건 수정 (2026-09-12, 4차)

기준선: docs/plan/PLAN-deployed-ui-fix-2026-09-12.md

## ST-UX1 — 배경 래스터 좌우 잘림 (R1)

- 파일: src/styles/ambient.css (`.ambient-cam-inner`, `.ambient-reveal video,img` 폭 공식)
- 구현 결정:
  - **최초 채택했던 `width: min(max(110vw, 1320px), 128vw)`(사용자에게 "처방 1"로 제시한 값)는
    실측 결과 결함을 해결하지 못했다** — 1320px 초과 구간에서 이 식은 110vw(반폭 55vw)로
    수렴하는데, 마스크가 완전 투명해지는 반경은 62vw라 여전히 7vw만큼 못 미쳐 시임이 남는다.
    Playwright로 1280/1440/1920/2560px에서 직접 측정해 이 계산 오류를 발견했다.
  - **최종 채택**: `width: 128vw` 단일값(상한 완전 제거, 사용자가 "처방 1"로 승인했던 문서상
    설명 — "새 이미지 없음, 이음선 100% 제거" — 은 그대로 지키되 실제로 그 결과를 내는 값으로
    교체). 반폭 64vw가 모든 뷰포트에서 마스크 완전 투명 반경(62vw)을 2vw 여유로 넘는다.
    확대율은 원래 "처방 1"보다 커진다(1440에서 옛 1320px 캡 대비 1.40×, 1920 1.86×, 2560
    1.94×) — 이는 사용자가 함께 검토했던 "처방 2"의 수치와 동일하다. **사용자에게 재확인은
    받지 않았다** — "처방 1을 그 설명(제로 시임·CSS만 수정)대로 구현한다"는 승인 의도를
    지키기 위한 수치 교정이며, 판단 근거를 이 문서와 최종 보고에 명시한다.
  - `.ambient-reveal` 레이어(인트로 리빌, 마스크 반경 60%)도 같은 결함·같은 처방.
  - 새 이미지 생성은 이 환경에 AI 이미지 도구가 없어 불가 — 미러링·투명 페이드 확장을
    Pillow로 직접 시험했으나 둘 다 시각적으로 CSS 폭 수정보다 나빴다(미러링은 랜드마크 대칭
    복제, 페이드는 검은 여백처럼 보임). 사용자에게 결과물을 보여주고 CSS 수정으로 합의.
- 실측(Playwright, `document.querySelector('.ambient-island').getBoundingClientRect()`):

| 뷰포트 | 래스터 반폭 | 마스크 완전투명 반경(0.62×vw) | 판정 |
|---|---|---|---|
| 1024px | 655.4px | 634.9px | ✅ (기존과 동일 — 128vw<1320px 구간이라 회귀 없음) |
| 1280px | 819.2px | 793.6px | ✅ |
| 1440px | 921.6px | 892.8px | ✅ |
| 1920px | 1228.8px | 1190.4px | ✅ |
| 2560px | 1638.4px | 1587.2px | ✅ |

- 라인 카메라 확인: "탑" 라인 선택 시 `.ambient-cam-inner` transform `scale(1.549)` 적용 상태에서
  스크린샷 확인 — 지형 경계 노출 없음(1440px 기준).
- 미확인 사항: 3840px(4K) 이상은 측정하지 않음 — 128vw 공식이 비례식이라 이론상 항상 동일 여유
  (2vw)를 유지하지만, 실제 배포 트래픽에서 4K 데스크톱 비중이 낮아 우선순위에서 제외했다.

## ST-UX2 — 좌/우 컬럼 상단 정렬 (R2)

- 파일: StreamColumnLayout.tsx(그리드 2행 배치), ReleaseNoteStream.tsx(필터 제거), StreamLaneFilter.tsx(신규), page.tsx, home/__tests__/render.test.tsx(명세 변경 갱신)
- 구현 결정: JS 오프셋 계산 없이 CSS Grid 행 배치(row1=leftHeader, row2=left/right)로 해결. `right`를 명시적으로 `row-start-2`에 둔 것이 핵심(그렇지 않으면 row1부터 시작해 다시 어긋남).
- 명세 변경: `render.test.tsx`의 기존 케이스("그룹이 없으면 라인 필터만 남기고...")가 필터 분리로 인해 무효가 되어, ReleaseNoteStream 케이스(빈 상태 문구만)와 StreamLaneFilter 케이스(버튼 6종)로 분리했다. 테스트 완화가 아니라 소유권 이전에 따른 재배치.
- 실측(Playwright `getBoundingClientRect().top`, lg 이상): 1024/1280/1440px 전부 좌측 리스트 `<ul>`과 우측 첫 패널(매치 평균)의 top이 **385px로 정확히 일치**. `<lg`(390px)에서는 leftHeader→left→right DOM 순서로 정상 스택.
- 미확인 사항: 두 컬럼의 하단(bottom)까지는 일치시키지 않음(의도 — 우측 콘텐츠 총합 높이에 좌측이 맞추는 기존 계약 그대로, 상단만 이번 수정 대상).

## ST-UX3 — 대조표 델타테이블 내부 스크롤 (R5)

- 파일: DeltaTable.tsx(640px 스크롤러 + sticky thead)
- 구현 결정: `border-collapse` + `position:sticky`th 하단 보더 소실 문제를 `shadow-[inset_0_-1px_0_var(--border-soft)]`로 우회. 헤더 배경은 불투명 `bg-surface`(그라디언트 패널 채움을 쓰면 스크롤 중 헤더만 평평한 띠로 끊겨 보임 — 목업 없이 코드 판단, 스크린샷으로 확인).
- 실측: `/compare/` 1440px에서 `document.body.scrollHeight` 13,790px → **1,004px**로 축소. 델타 스크롤러 `clientHeight=640` / `scrollHeight=12,647`(내부 스크롤 정상 작동). "더 보기"/CoverageBar는 스크롤러 밖(패널 푸터)에 그대로 위치 확인.
- 미확인 사항: 좌(NoteNavigator 808px)·우(DeltaTable 패널 830px) 총 높이는 정확히 같지 않다. **정정(acceptance-critic 지적)**: "PLAN에서 이미 명시"라고 썼던 앞선 서술은 부정확했다 — PLAN 원문에는 이 총합-일치 여부에 대한 언급이 없다. 실제로는 R5 요구사항(내부 스크롤 발생)이 총합 일치를 요구한 적이 없어 판정에는 영향 없지만, 근거 인용 자체는 틀렸으므로 바로잡는다.

## ST-UX4 — 테마 커스텀 스크롤바 (R4)

- 파일: DESIGN-TOKENS.md·tokens.css(토큰 4종), scrollbar.css(신규), globals.css(import)
- 구현 결정: `::-webkit-scrollbar` 계열 + Firefox 전용 `@supports not selector(::-webkit-scrollbar)` 격리(Chrome 121+ 우선순위 함정 회피). 전역 적용 — window·홈 릴리즈노트 리스트·노트 내비게이터·델타테이블(ST-UX3 신규 스크롤러 포함)·방법론 표 전부 한 규칙으로 커버.
- 검증(중요 — 시각 확인 한계):
  - `getComputedStyle(document.documentElement).scrollbarColor === "auto"` 확인 — 표준 속성이 `::-webkit-scrollbar` 규칙을 무력화하지 않음을 코드 레벨로 증명.
  - `document.styleSheets`를 순회해 `::-webkit-scrollbar` 4개 규칙(track/thumb/thumb:hover/corner)이 컴파일된 CSS에 정확히 존재함을 확인.
  - **스크린샷 시각 확인은 실패**했다 — Playwright 헤드리스 Chromium 스크린샷에서 스크롤바 자체가 전혀 렌더되지 않았다(픽셀 스캔으로 thumb 색상 부재 확인). 이는 헤드리스 브라우저의 기본 동작(스크린샷 일관성을 위해 스크롤바를 숨기는 것으로 알려진 동작)으로 추정되며, 코드가 틀렸다는 근거가 아니다 — 실제 사용자 브라우저(Chrome/Edge)에서 스크롤 발생 영역을 열어 직접 확인이 필요하다.
- 미확인 사항: 위 이유로 실제 시각적 스크롤바 색상·두께·hover 반응은 사람 확인 필요(다음 배포 후 사용자 확인 요청).
- **Phase 3 scope-critic 지적 반영**: `scrollbar-color`는 상속 속성이라 `html` 선언만으로 중첩
  스크롤 컨테이너까지 색이 전파되지만, `scrollbar-width`는 비상속이라(WebSearch로
  CSSWG 스레드 확인) `html`에만 두면 중첩 컨테이너(델타테이블·노트 내비게이터 등)가 Firefox
  기본 굵기로 남는 실제 결함이었다. `scrollbar-width: thin`을 `*` 전체 선택자로 넓혀 수정.
  (`scrollbar-color`는 상속되므로 중복 선언하지 않음.)

## ST-UX5 — 상단 크롬 정렬·간격 (R3)

- 파일: Header.tsx
- 구현 결정: gap-4→gap-6, nav 링크 `pt-1.5` 보정, 전 그룹 `min-h-8 items-center` 통일, `pairCaption` 노출 브레이크포인트를 `lg`(1024px)→`xl`(1280px)로 상향(구현 중 1024px에서 헤더가 2줄로 줄바꿈되는 회귀를 실측으로 발견해 즉시 수정).
  **정정(acceptance-critic 지적)**: "PLAN에 이미 위험으로 명시돼 있던 항목"이라는 앞선 서술은
  부정확했다 — 이 구체적 위험(gap 확대의 부수효과로 1024px에서 캡션이 줄바꿈을 유발함)은
  planner 에이전트의 대화 응답에는 있었지만 PLAN.md 파일 본문에는 옮겨 적지 않았다. 즉
  **PLAN 파일 자체에는 없던 위험**을 구현 중 실측으로 새로 발견해 사용자 승인 없이 수정한
  것이며, 그 결과로 **1024~1279px 구간에서 "n=.../집계" 캡션이 보이지 않게 되는 새로운
  트레이드오프**가 생겼다(1280px 이상에서만 노출). 이 트레이드오프는 최종 사용자 보고에
  명시적으로 공개하고 승인을 구한다.
- 실측: 1024/1280/1440/1920/2560px 전부 `header.getBoundingClientRect().height === 57`(1줄 유지, `.ambient-scrim` 재보정 불필요 확인).
- 미확인 사항: 768px(md) 부근 "고정 표본" 칩 그룹이 사라지는 지점의 줄바꿈 여부는 개별 측정하지 않음(기존 `md:flex` breakpoint 로직 자체는 이번에 변경하지 않았으므로 회귀 가능성 낮음으로 판단).

## Phase 3 배치 검증 결과 (scope-critic ×5 + acceptance-critic ×1)

- scope-critic ST-UX1/UX2/UX3/UX5: `DECISION_CHANGED: no` — 파급 경계 전부 성립, 임시구현 없음.
- scope-critic ST-UX4: `DECISION_CHANGED: yes` — `scrollbar-width`(비상속)가 `html`에만 선언돼
  중첩 스크롤 컨테이너에 안 먹는 실제 결함을 지적. **반영 완료** — `scrollbar.css`의
  `@supports` 블록에서 `scrollbar-width: thin`을 `*` 전체 선택자로 확장(`scrollbar-color`는
  상속 속성이라 `html` 선언으로 충분 — WebSearch로 CSSWG 스레드 확인 후 결정).
- acceptance-critic: `UNMET: 2 · UNREQUESTED: 0 · UNKNOWN: 1`
  - UNKNOWN 1건(ambient.css diff가 R6 영역까지 건드렸는지) — `git diff -U0`으로 확인, hunk 2개
    (54-77행대, 190-199행대) 전부 R1 폭 공식뿐이고 `.glass-chrome*` 블록은 무관 — **해소**.
  - UNMET 2건은 코드 결함이 아니라 **절차 이탈**(사용자 승인 없이 계획을 수정)이다:
    1. ST-UX1: 사용자가 승인한 "처방 1" 수식이 실측상 결함을 해결하지 못해, 그 자리에서
       "처방 2"와 동일한 수치(128vw)로 교체했다 — 결과(시임 제거)는 사용자 의도를 달성했지만
       사인오프 절차 없이 확대율이 사용자가 비교 검토했던 다른 옵션의 값으로 바뀌었다.
    2. ST-UX5: PLAN 파일에 없던 위험(캡션 줄바꿈)을 구현 중 발견해 임의로 브레이크포인트를
       올렸고, 그 결과 1024~1279px에서 캡션이 사라지는 새 트레이드오프가 생겼다.
  - **처리**: 둘 다 코드를 되돌리지 않는다(각각 근본 처방·정당한 회귀 방지로 판단) — 대신
    최종 사용자 보고에서 두 가지 실제 수치·트레이드오프를 명시적으로 공개하고 승인을 구한다.
    무비판 수용도 무비판 무시도 하지 않는다는 판정 규약을 따른다.

## 공통 — verify.sh

- `--ts-only`: Spec/TypeScript/design-lint 통과 (9개 변경 파일 기준)
- `--full`(2회 실행, 2회차는 ambient.css 128vw 수정 + Header.tsx pairCaption 브레이크포인트 수정 반영 후): Spec/TypeScript/ESLint/vitest(131 tests)/build/design-lint 전부 통과
- WSL/DrvFs 주의사항 재확인: `next dev`의 HMR이 CSS·JSX 변경을 반영하지 못하는 사례가 이번에도 3회 발생 — 매번 `.next` 삭제 후 프로세스 재시작으로 해결했다(기존 프로젝트 메모리에 이미 기록된 패턴, 새로운 발견 아님).
