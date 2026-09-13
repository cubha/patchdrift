# PLAN — `indirect-effect`(간접 영향) 판정 상태 도입

- 생성: 2026-09-13 · 기준 HEAD: ebd9224(효과크기 바닥 커밋 직후)
- 계획 수립: planner(opus) 위임 + 사용자 정의 정정 반영
- 라우팅: 전량 `[S]`(타입 → 재분류 → 배선 → 데이터 → UI 선형 의존)

## ① 사용자 요구사항 (원문 — 요약 금지)

> 옵션 B로 진행. 챔피언 버프/너프로 인한 골드획득량 감소같은 간접효과는 굳이 LLM이 아니어도
> 게임플레이를 하는사람이라면 자연스러운 인과관계로 인지할 수 있는 상황임.
>
> 내가 생각하는 간접효과는 특정챔피언 (드레이븐)에 대한 패치내용이 없는데 드레이븐 승률과
> 픽률이 큰폭으로 감소 --> 드레이븐이 첫 코어템으로 가는 아이템의 너프가 있었음 --> 첫 코어템
> 이후 라인전의 포텐셜이 약해져 자연스레 승률/픽률감소
>
> 이런게 간접효과야

추가 확정(질문 응답): **"B 변형 — 홈에 간접효과 전용 섹션을 따로 둔다"** — 릴리즈 스트림
사이사이 끼워넣기는 하지 않되(옵션 B), 홈 하단에 전용 섹션을 신설해 드레이븐 패턴을 인과
체인과 함께 노출한다.

## ② 실측 근거 (재조사 불필요)

효과크기 바닥 적용 후 재생성된 현재 데이터 기준:

| | 26.16→26.17 | 26.17→26.18 |
|---|---|---|
| `unannounced` | 41 | 81 |
| verified 원인 후보 보유 | 21 (lane 2·champion 13·item 6) | 15 (lane 1·champion 14) |
| └ **confidence ≥ medium** | **9** (lane 2·champion 5·item 2) | **5** (lane 1·champion 4) |

**동일 엔티티 인과는 0건** — verified 후보는 전부 교차 엔티티다. 따라서 "교차 여부"로는 사용자가
말한 가치 있는 케이스를 못 걸러낸다. 실제로 존재하는 드레이븐 패턴(챔피언 델타 ← 아이템 노트):

- 제리 승률 +5.75%p ← [item] 폭풍갈퀴 / 활력증진의 펜던트 (medium)
- 리 신 픽률 −2.04%p ← [item] 활력증진의 펜던트 (medium)
- 이렐리아 밴률 +5.93%p ← [item] 구인수의 격노검 (medium)
- 루시안 픽률 +2.76%p ← [item] 구인수의 격노검 (medium)

사용자가 "당연하다"고 지적한 케이스(`lane` 골드 ← 챔피언 버프)도 같은 medium+ 집합에 들어온다 —
이 역시 간접 영향이 맞으므로 **같이 재분류**한다(미공지 헤드라인에서 빠지는 것이 목적에 부합).
"당연함"의 차이는 **홈 노출 방식**(옵션 B: 스트림 비노출)으로 흡수한다.

## ③ 확정 설계

**판정 규칙**: `status === "unannounced"` **AND** `causes` 중 `verified === true` **AND**
`candidateNoteId !== null` **AND** `confidence ≥ medium`인 후보가 1건 이상 → `"indirect-effect"`.

- `high`만 채택하는 안은 **구조적 무효**(두 패치쌍 모두 high가 0건 — LLM이 간접 인과에 high를
  거의 쓰지 않는다).
- `low`까지 포함하는 안은 총량이 2배 이상 늘지만(9→21, 5→15) 늘어나는 건 전부 저신뢰
  픽/밴률 추론이라 차별 지표를 오히려 오염시킨다. 임계값은 상수로 노출해 조정 가능하게 둔다.

**재분류 지점(구조적 제약)**: `verdict.assignStatus` 실행 시점엔 `causes`가 **항상 비어 있다**
(`run-match.ts`가 verdict → sortDeltas → LLM 2단 순서로 돌고, LLM 결과는 그 뒤에 채워진다).
따라서 재분류는 verdict가 아니라 **LLM 2단 이후의 별도 post-hoc 단계**여야 하며, 재분류 직후
`sortDeltas`를 다시 호출해 `runMatchPipeline`의 "항상 정렬된 상태로 반환" 계약을 지킨다.

**원천 링크**: 재분류 시 `evidence.noteAnchor`를 판정 근거가 된 `candidateNoteId`의 `anchorUrl`로
채운다("모든 판정문은 원천 링크를 가진다" 원칙). `matchedNoteId`/`matchedNoteIds`는 **null/[] 유지**
— 1단 결정론 매칭 결과가 아니므로 채우면 `representativeStatus`(대조표)·`selectAnnouncedPreview`
(홈)가 이 행을 "노트와 짝지어진 행"으로 오인한다.

**정렬 우선순위**(`shared/status-order.ts`): unannounced 0 · **indirect-effect 1** ·
announced-inconsistent 2 · announced-consistent 3 · below-threshold 4 · insufficient-sample 5 ·
no-change 6. 기존 5종의 상대 순서는 그대로 보존된다.

**뱃지**(신규 토큰 0): `border-accent text-fg-2` — `unannounced`(accent 보더+accent 텍스트)와
같은 계열이되 한 단계 낮춘 표기로 둘의 혈연관계를 색으로 드러낸다. 라벨 "간접 영향"(코드 기존
어휘 `inferIndirectCandidates`·"간접 영향 후보"와 일치).

**홈(옵션 B 변형)**: `releaseStream.ts`는 `status === "unannounced"`만 그룹핑하므로 재분류분이
자동으로 스트림에서 빠진다(**코드 변경 불요**, 회귀 테스트만). 대신 홈 하단에
`IndirectEffectPanel`을 신설해 상위 N건을 `엔티티 · 지표 Δ ← [섹션] 원인 엔티티` 인과 체인으로
노출한다.

## ④ 스코프 제외

- `low` 신뢰도 후보 포함 · `high` 전용 안(②의 근거로 기각)
- 효과크기 바닥 값 재조정(직전 커밋 ebd9224에서 확정, 이번에 건드리지 않음)
- LLM 2단 타깃 필터(`llm-match.ts` `unannounced`/`announced-inconsistent`) 변경 — 재분류는 그
  이후에만 일어나고 다음 실행 때 `assignStatus`가 status를 처음부터 다시 계산하므로 되먹임 없음
- 홈 히어로 타일 4분할 확장(레이아웃 리스크 회피 — 대조표 탭 + 전용 섹션으로만 노출)

## ⑤ SubTask 목록

| id | 설명 | 파일 | TDD |
|---|---|---|---|
| ST-IE1 | 재분류 순수 함수 + 임계 상수 | `src/pipeline/match/indirect-effect.ts`(신규), `__tests__/indirect-effect.test.ts`(신규) | ✅ |
| ST-IE2 | 타입·정렬·라벨·뱃지 확장 | `types.ts`, `shared/status-order.ts`, `lib/format.ts`, `StatusBadge.tsx` | — |
| ST-IE3 | run-match 배선(LLM 이후 재분류 → 재정렬) | `scripts/run-match.ts`, `match/__tests__/run-match.test.ts` | ✅ |
| ST-IE4 | 두 패치쌍 데이터 재생성 | `data/aggregated/deltas/*.json` | — |
| ST-IE5 | 대조표 탭 + 커버리지 카운트 | `compare/logic.ts`, `compare/__tests__/logic.test.ts`, `CoverageBar.tsx` | ✅ |
| ST-IE6 | 홈 선택 로직(인과 체인 해석) | `home/indirectEffects.ts`(신규), `home/__tests__/indirectEffects.test.ts`(신규) | ✅ |
| ST-IE7 | 홈 전용 섹션 컴포넌트 + 배선 | `home/IndirectEffectPanel.tsx`(신규), `src/app/page.tsx` | — |
| ST-IE8 | 방법론 정의표 7행 + 디자인 문서 | `StatusDefinitionTable.tsx`, `methodology/page.tsx`, `DESIGN-TOKENS.md`, `PLAN-patchgap.md` | — |
| ST-IE9 | 검증 + 커밋 | — | — |

## ⑥ 완료 조건

- 재생성 후 `meta.counts`에서 `unannounced` 감소분 == `indirect-effect` 증가분(두 패치쌍 모두),
  나머지 5개 status 카운트 **불변**
- 26.16→26.17 `indirect-effect` ≈ 9건, 26.17→26.18 ≈ 5건(②의 실측치와 일치)
- 홈 릴리즈 스트림에 `indirect-effect` 그룹이 **0건** 노출(옵션 B) · 홈 전용 섹션에 인과 체인 노출
- `npx tsc --noEmit` · `eslint --max-warnings 0` 클린 + 변경 파일 vitest 개별 GREEN
  (전체 스위트·build는 공유 머신 메모리 압박으로 OOM 이력 — 재시도 2회 상한)
