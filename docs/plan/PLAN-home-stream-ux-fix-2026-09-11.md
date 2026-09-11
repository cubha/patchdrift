# PLAN — 홈 릴리즈노트 스트림 UX 결함 3건 수정
생성: 2026-09-11 · 소스: 세션 대화(사용자 스크린샷 지적)

## 요구사항 (사용자 요청 원문 기준)

- R1. (질문/설명) "지금 선택된버전의 패치에 없는 모든 대상이 전부다 표시되고있는데 의도가뭐니?" —
  코드 변경 대상 아님. `releaseStream.ts`가 미공지 엔티티를 개수 제한 없이 전부 스트림에
  삽입하는 것은 기존 확정 설계(HANDOFF-redesign-2026-09-10.md §1-1, "짝 없는 관측(미공지)을
  같은 스트림에 삽입"). 체감 문제(끝없는 스크롤)는 R2·R3로 해소한다.
- R2. "우측섹션영역 기준으로 좌측섹션도 고정 → 내부스크롤동작하도록" — `src/app/page.tsx`의
  2컬럼 그리드에서, 우측 컬럼(SideMatchAverages+LaneGapPanel+DiscordPanel) 높이를 기준으로
  좌측 컬럼(LaneFilter+ReleaseNoteStream)도 같은 높이로 고정하고, 좌측 스트림 리스트만
  내부 스크롤(overflow-y-auto)되게 한다. lg 미만에서는 기존 자연 높이 유지.
- R3. "좌측섹션의 설명의 모든항목이 전부 펼쳐져있어. 클릭하여 expand해서 상세내용 확인하도록" —
  `ReleaseNoteRow.tsx` 각 카드 기본 접힘(헤더: 아이콘+이름+대표 관측 1줄), 클릭 시 상세 펼침.
- R4. "챔피언명 아래에 밴률 변동이뜨는데 해당 영역 최하단에 벤률 픽률 변동이 전건이뜨는데
  이것도 좀 확인좀해봐" — 버그. `ReleaseNoteRow.tsx`의 미공지 카드에서 헤더 `ObservationLine`
  (selectEntityObservation이 |delta| 최대로 고른 레코드)과 카드 하단 `group.deltas.map(...)`
  전체 리스트가 같은 레코드를 중복 렌더한다. 리스트에서 대표 관측 레코드를 제외.

## 확정 제약·거부 사항

- X1. 미공지 노출 건수 제한(cap)은 하지 않는다 — releaseStream.ts 설계 의도 유지(R1).
- X2. 배경 협곡 테마(bg 자체 리스킨)는 이 PLAN 범위 밖. 별도 병렬 에이전트가 비교
  아티팩트로만 작업 중(코드 미반영, 사용자 결정 대기).
- X3. `ReleaseNoteRow`는 서버 컴포넌트 유지를 우선 시도한다(`<details>/<summary>` 네이티브
  디스클로저) — 불가피한 이유가 있을 때만 "use client" 전환.

## SubTask 목록

- ST1. [레이아웃] 우측 컬럼 높이 기준 좌측 고정 + 내부 스크롤
  → `src/app/page.tsx`
  → 라우팅: [S]
- ST2. [아코디언] `ReleaseNoteRow` 카드 기본 접힘 + 클릭 펼침 (`<details>/<summary>`)
  → `src/components/home/ReleaseNoteRow.tsx`
  → 라우팅: [S] (ST1과 파일 독립이나 카드 마크업을 ST4가 건드리므로 순서상 뒤에 배치)
- ST3. [TDD] 미공지 카드 대표 관측 중복 렌더 제거 — 순수 함수 `excludeObservation`
  → `src/components/home/logic.ts`, `src/components/home/__tests__/logic.test.ts`,
    `src/components/home/ReleaseNoteRow.tsx`(소비부)
  → 라우팅: [S]

라우팅 판정: 독립 후보 3개(4개 미만) → **전량 [S] 인라인 순차**. team-dev 위임 없음.

## UI 설계 명세 경로

- Ground Truth 매칭: 기존 화면(홈) 수정 — `/frontend-design` 호출 생략.
- 참조: `docs/design/DESIGN-TOKENS.md`(V4 협곡 나이트 토큰), `docs/design/HANDOFF-redesign-2026-09-10.md` §4-1(스트림 카드 구조).
- 신규 시각 요소 없음(기존 토큰·컴포넌트 재사용, 레이아웃/인터랙션 구조만 변경).
