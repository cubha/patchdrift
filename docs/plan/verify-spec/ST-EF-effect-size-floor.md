### VERIFY-SPEC — 미공지 판정 효과크기 바닥(effect-size floor) 도입

PLAN: `docs/plan/PLAN-unannounced-effect-size-floor-2026-09-13.md`

- **기준선 요구사항**: PLAN ①(사용자 요구사항 원문) 그대로 — 효과크기 바닥(pickRate 2.0%p·
  banRate 3.0%p·winRate 2.0%p 절대, adoptionRate 상대 25%, 연속 지표 바닥=0)을 도입해 통계적
  유의성만으로 "미공지"를 판정하던 결함을 고친다. `unannounced`로 승격시키지 않고 새 status
  `below-threshold`로 분류한다.

- **변경 파일** (신규|수정):
  - `src/pipeline/aggregate/stats.ts` (수정) — `EFFECT_SIZE_FLOORS`, `meetsEffectFloor()`,
    `proportionNumerator()` 추가
  - `src/pipeline/aggregate/__tests__/stats.test.ts` (수정) — 위 3개 헬퍼 테스트 [TDD]
  - `src/pipeline/types.ts` (수정) — `MatchStatus`에 `"below-threshold"` 추가 + 주석
  - `src/pipeline/shared/status-order.ts` (신규) — `STATUS_SORT_PRIORITY` 단일 소스
  - `src/pipeline/match/verdict.ts` (수정) — `assignStatus()`의 "짝 없음" 분기에만 바닥 적용,
    로컬 `STATUS_SORT_PRIORITY` 제거 후 공유 모듈 import
  - `src/pipeline/match/__tests__/verdict.test.ts` (수정) — below-threshold 판정 8건 + 회귀
    가드 2건(설계 정정 검증: 짝 있음 + 바닥 미달이어도 announced-consistent/inconsistent 유지) +
    sortDeltas below-threshold 순서 1건 [TDD]
  - `src/pipeline/match/delta.ts` (수정) — `carryOverMatchIds()` 추가
  - `src/pipeline/match/__tests__/delta.test.ts` (수정) — carryOverMatchIds 테스트 5건 [TDD]
  - `scripts/run-match.ts` (수정) — main()에 carry-over 로직 배선(이전 파일 존재 시 항상 시도,
    이미 채워진 matchIds는 덮지 않음)
  - `src/components/compare/logic.ts` (수정) — `STATUS_FILTERS`에 `below-threshold` 칩,
    `representativeStatus`를 로컬 `MatchStatus[]`+`indexOf`에서 공유 `STATUS_SORT_PRIORITY`로
    전환(미등록 상태 -1 최우선 오판정 결함 제거), `computeCoverage`에 `belowThresholdCount` 추가
  - `src/components/compare/__tests__/logic.test.ts` (수정) — 대표상태 회귀가드 1건 +
    STATUS_FILTERS 칩 1건 + computeCoverage 필드 갱신 [TDD]
  - `src/components/compare/__tests__/render.test.tsx` (수정) — CoverageStats/coverage prop에
    `belowThresholdCount` 필드 추가, 상태 칩 개수 11→12로 갱신(타입 오류 수정 성격, 새 동작 없음)
  - `src/components/StatusBadge.tsx` (수정) — `below-threshold` 뱃지 클래스 추가(신규 토큰 0)
  - `src/lib/format.ts` (수정) — `STATUS_LABELS`에 `below-threshold: "임계 미달"` 추가
  - `src/lib/__tests__/format.test.ts` (수정) — statusLabel 케이스 추가
  - `src/components/compare/CoverageBar.tsx` (수정) — "임계 미달 N" 문구 추가
  - `src/components/methodology/StatusDefinitionTable.tsx` (수정) — 6번째 행(below-threshold),
    바닥 값을 props로 주입(`pickFloor`/`banFloor`/`winFloor`/`itemRelFloor`)
  - `src/components/methodology/__tests__/StatusDefinitionTable.test.tsx` (수정) — 6행 렌더 확인
  - `src/app/methodology/page.tsx` (수정) — `EFFECT_SIZE_FLOORS`에서 props 주입
  - `src/components/home/releaseStream.ts` (수정) — `interleave()`에 슬롯 0 최소 1건 보장
    (U < M+1일 때만 발동, U=0이면 no-op)
  - `src/components/home/__tests__/releaseStream.test.ts` (수정) — 슬롯 0 보장 1건 + U=0 no-op
    1건 [TDD]
  - `docs/design/DESIGN-TOKENS.md` (수정) — 상태 색 문법 표에 below-threshold/no-change 행 추가
  - `docs/plan/PLAN-patchgap.md` (수정) — MatchStatus 6종 계약 확장 이력 기록
  - `data/aggregated/deltas/26.16_26.17.json` (재생성) · `26.17_26.18.json` (재생성 — carry-over
    경유)

- **관찰 가능한 계약**:
  - `meetsEffectFloor(metric, delta, before)` — 단위는 비율(0~1)이지 %p가 아니다. `delta===null`
    은 항상 false. absolute 바닥은 `|delta|>=value`, relative는 `before===null`→false,
    `before===0 && delta!==0`→true(상대변화 무한대), 그 외 `|delta|/|before|>=value`.
  - `assignStatus(delta, match)` — 유의(q<α, CI≠0) + 짝 없음 + 바닥 미달 → `"below-threshold"`.
    유의 + 짝 있음(방향 무관)은 바닥과 **무관하게** 기존 그대로(`announced-consistent`/
    `announced-inconsistent`) — 이게 이번 변경의 핵심 불변식이다.
  - `carryOverMatchIds(newDeltas, oldById)` — 새 레코드의 `evidence.matchIds`가 이미 채워져
    있으면 손대지 않는다. 비어있고 이전 파일에 같은 id로 non-empty 값이 있으면 승계.
    `carriedOverCount`로 실제 승계 건수 반환.
  - `interleave` — U(미공지 그룹 수) > 0이고 균등분산 공식이 슬롯 0에 0을 배정하면 최소 1건으로
    강제. 총량은 항상 보존(마지막 슬롯이 `floor(slots*U/slots)=U`로 수렴).

- **구현 결정** (stub/fallback/하드코딩 유무, "나중에 제대로" 보류 항목):
  - 요구사항 2 "isSignificant()에 바닥 체크 추가"를 **문자 그대로 구현하지 않았다** — `assignStatus`
    의 "짝 없음" 분기에만 적용(PLAN ②-1 상세 근거). `isSignificant()`/`significance.ts`는
    무변경.
  - 요구사항 3 "분자 필드"는 **파생 계산**(`proportionNumerator`)으로 해결, `DeltaRecord`에
    필드 추가하지 않음(PLAN ②-2).
  - 아이템 상대기준에 최소 분자 가드(예: 채택 횟수 ≥N)는 **미적용**(Set B를 넘는 신규 정책이라
    이번엔 넣지 않음). 재생성 결과 극저베이스 아이템 9건이 생존했으나 전부 상대변화 30%+로
    실질적 신호였음(루난의 허리케인 +40%, 유령 무희 +50% 등) — 별건 제안 불필요로 판단.
  - HeroSummary 엔티티 단위 카운트 통일은 **연기**(기존 결함, 사용자 escape hatch 적용). 이번
    변경으로 새로 벌어지지 않았는지만 확인(아래 인접 경계 참고).
  - releaseStream 슬롯 0 보장은 **조건부 발동**(U<M+1일 때만) — 26.16→26.17(U=41) 재생성 후
    실측 시 노트 수 M과 비교해 발동 여부 확인 필요(완료 조건 참고).
  - `indirect-effect`(간접효과, 별도 병렬 트랙)는 이번 스코프에 포함하지 않음. `MatchStatus`
    유니온에 나중에 추가될 때 `status-order.ts`/`STATUS_LABELS`/`STATUS_CLASSES`/
    `STATUS_FILTERS` 4곳만 건드리면 되도록 단일 소스 구조를 유지했다.

- **인접 경계**:
  - 직접 호출부: `verdict.assignStatus` → `compare/logic.ts`(대표상태·필터·커버리지) ·
    `home/releaseStream.ts`(unannounced만 소비, 자동 축소) · `StatusBadge`/`format.ts`(표시) ·
    `discord/webhook.ts`(status==="unannounced" 필터, **무변경** — 자동으로 순수 미공지만 남음)
  - API/데이터 계약: `data/aggregated/deltas/*.json`의 `meta.counts`에 `below-threshold` 키
    추가(Partial이라 스키마 파괴 없음), `DeltasFile` 타입 무변경
  - 공유 상태: `src/pipeline/shared/significance.ts`(`isSignificantDelta`)는 **무변경** —
    below-threshold 행도 계속 "유의 변화"로 집계됨(의도된 동작, home 헤드라인 `statCount`·
    discord `significantCount`에 영향 없음)
  - LLM 2단 타깃 집합(`llm-match.ts:318`, `unannounced`/`announced-inconsistent` 상위 50건)이
    바뀐다 — below-threshold는 제외되므로 LLM 예산이 진짜 신호에 집중됨(개선). **병렬 진행 중인
    indirect-effect 트랙의 기준선(verified causes 22건)이 재생성 후 달라짐 — 통보 완료**(PLAN ⑦)

- **미확인 사항**:
  - releaseStream 슬롯 0 강제 발동 여부를 실제 26.16→26.17/26.17→26.18 재생성 데이터로 육안
    확인하지 않음(단위 테스트로만 검증) — ST-EF10에서 홈 화면 렌더 확인 시 함께 볼 것.
  - 26.17→26.18 carry-over 실제 승계 건수(예상 ~1,912건 근방)는 재생성 로그로만 확인, 파일
    diff의 evidence.matchIds 필드 값 자체를 전수 비교하지는 않았음(id 매칭 기반 승계라 논리적
    으로는 안전하나, entity-match 1단 재실행으로 일부 델타의 id 구성이 패치 간 변할 가능성은
    이론상 배제 못 함 — 실측 필요).
  - 방법론 페이지의 새 조건 문구("|Δ|<바닥(픽 2%p/밴 3%p/승 2%p, 채택률 상대 25%)")가 실제
    브라우저 렌더에서 줄바꿈 없이 자연스러운지 시각 확인 안 함(텍스트 컨텐츠 단위테스트만 통과).
