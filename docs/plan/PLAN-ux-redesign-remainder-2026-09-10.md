# PLAN — UX 개편 잔여 3건 (2026-09-10)

생성: 2026-09-10 · 소스: 세션 대화(D-1a 메모리) + HANDOFF-redesign-2026-09-10.md

## 요구사항 (사용자 결정 원문 기준)

- R1. 홈 릴리즈노트 스트림에서 라인 엔티티(예: 바텀 골드@14 미공지)의 아이콘이 EntityIcon
  기본 폴백("바" 첫글자 텍스트 박스)으로 렌더된다 — 대조표(RowIcon)는 이미 LaneGlyph로 고쳐져
  있으므로 홈도 같은 모양으로 맞춘다("동형 수정").
- R2. 항목상세 차트 범례의 "95% CI 오차 막대" 문구에 실측 CI 값 병기가 빠져 있다
  (시안: `[46.3, 48.2] · [33.3, 35.2]`). 저장 CI(챔피언 pick/ban/win, 아이템 adoptionRate)가
  양쪽 막대 모두에 적용된 경우에만 표시 — 델타-CI 폴백(one-bar-only) 케이스는 전/후 개별 CI가
  없으므로 표시하지 않는다(무근거 문장 금지 원칙).
- R3. 히어로 앰비언트(`HeroAmbient.splashUrl`)가 프로덕션 홈에서 미배선 상태 — 2026-09-10 구현
  세션에서 "①candidate, 일정 압박으로 보류"로 명시 절단됐던 항목. 패치 대표 챔피언 1장의 스플래시
  자산을 다운로드해 배선한다.

## 제외 합의 (요청했지만 하지 않기로 한 것)

- X1. 항목상세 패널 배치(잔여 4번 항목)는 이 PLAN에 포함하지 않는다 — 사용자 지시로 비교
  아티팩트를 먼저 만들어 배치안을 결정한 뒤 별도로 구현한다.
- X2. 라인 어휘(바텀=원딜+서폿 umbrella) 변경 없음 — 사용자 결정으로 종결(D-1a 메모리).

## 구현계획

- P1. [비TDD-UI] `src/components/home/ReleaseNoteRow.tsx` — `icon.entityType === "lane"`일 때
  `LaneGlyph`(labelled)로 렌더하는 로컬 헬퍼 추가. `DeltaTable.tsx`의 `RowIcon` 패턴과 동형.
  검증: `src/components/home/__tests__/render.test.tsx`에 라인 미공지 그룹 렌더 시 svg 존재 +
  텍스트 폴백("바") 부재를 확인하는 테스트 추가(test-after, 기존 svg-title 검증 패턴 재사용).
- P2. [TDD] `src/components/item/chartData.ts` — `ItemChartData`에 `barCi: {before,after} | null`
  필드 추가. `resolveUsableStoredCi`가 적용된 경우에만 non-null(두 패치 각각의 원본 `Interval`).
  `src/components/item/__tests__/chartData.test.ts`에 RED 테스트 먼저(저장 CI 케이스 → barCi
  non-null, 델타-CI 폴백 케이스 → barCi null).
- P3. [비TDD-UI] `src/app/item/[id]/page.tsx` — 범례 CI 항목에 `chartData.barCi`가 있을 때만
  `[lo, hi] · [lo, hi]`(pp 스케일 ×100, 소수 1자리) mono 텍스트 병기. 포맷 헬퍼는
  `src/components/item/metricFormat.ts`에 `formatCiRange(interval: Interval): string` 추가.
- P4. [TDD] `src/components/home/heroSplash.ts`(신규) — 델타 행에서 패치 대표 챔피언 1명을
  결정론적으로 고르는 순수 함수 `resolveHeroSplashEntityKey(rows)`. 규칙: entityType="champion" +
  scope=all(3세그먼트 id) + status!=="insufficient-sample" + delta!==null 인 행 중 |delta| 최댓값
  1건의 entityKey. 없으면 null. `src/components/home/__tests__/heroSplash.test.ts` RED 먼저.
- P5. [비TDD-배선] `src/app/page.tsx` — `resolveHeroSplashEntityKey`로 얻은 entityKey를
  `/dd/splash/{key}_0.jpg`로 변환해 `HeroSummary`에 `ambientSplashUrl`로 전달.
- P6. [비코드] 실제 26.16→26.17 데이터 기준 top-1 챔피언(현재 실측: Qiyana, 키아나 밴률
  +15.7%p) 스플래시 1장을 `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/
  {Key}_0.jpg`에서 `public/dd/splash/{Key}_0.jpg`로 다운로드(수동, 파이프라인 스크립트 아님 —
  §5 "1~2장만" 스코프 결정 유지).

## 라우팅 판정

전부 `[S]` 직렬(독립 SubTask 3~4개, team-dev `[P]` 임계값 4 미만) — 인라인 순차 구현.

## 검증

`bash verify.sh --full` (기존 게이트) — 신규 스킬 판정(scope-critic/acceptance-critic)은
파일 변경 규모가 작아(≤6개) TRIAGE 기준 미달일 수 있으나, 코드축은 이번 PLAN 파일을 기준선으로
1회 배치 판정한다.
