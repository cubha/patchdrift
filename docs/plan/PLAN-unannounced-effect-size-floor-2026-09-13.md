# PLAN — 미공지 판정 효과크기 바닥(effect-size floor) 도입

- 생성: 2026-09-13 · 기준 HEAD: ca05b6a
- 스킬: /sh-dev-loop (`--auto --tdd`) · 계획 수립: planner(opus) 위임
- 라우팅: 전량 `[S]` (독립 SubTask 3개 < 4)

## ① 사용자 요구사항 (원문 — 요약 금지)

작업: 미공지 판정 기준에 효과크기 바닥(effect-size floor) 도입 — 통계적 유의성만으로 "미공지"를
판정하던 결함 수정.

사용자 승인된 방향 (Set B + 아이템 상대 25%) — 효과크기 바닥(절대값, %p 단위):
- pickRate: 2.0%p
- banRate: 3.0%p
- winRate: 2.0%p
- adoptionRate(아이템): **상대변화** ≥25% (before 대비 |delta|/before ≥ 0.25) — 절대 바닥 아님
- goldAt10/goldAt14/firstSec/avgDurationSec: 이번 스코프에서는 임계값 미조정(제로섬 왜곡 없어
  후순위) — 코드 구조상 "바닥 없음"을 명시적으로 유지(하드코딩 스킵이 아니라 "임계값=0" 취급으로
  기존 동작 보존)

요구사항:
1. **새 상수/헬퍼**: `stats.ts`에 `WIN_RATE_MIN_N` 옆에 metric별 효과크기 바닥 상수 추가(픽/밴/
   승률=절대 %p, 채택률=상대 비율). "바닥 미달 판정" 순수 함수 추가(테스트 가능하게 분리).
2. **verdict.ts 변경**: `isSignificant()` 판정에 효과크기 바닥 체크 추가. 통계적으로 유의(q<α,
   CI≠0)하지만 바닥 미달인 델타는 `unannounced`로 승격시키지 말고 **새 status `below-threshold`**
   로 분류(기존 `no-change`=비유의와 구분 — below-threshold는 실제로 유의하지만 실무상 무시 가능한
   규모). `MatchStatus` 타입에 `below-threshold` 추가, `STATUS_SORT_PRIORITY`에 순위 배정
   (unannounced보다 아래, insufficient-sample 근처).
3. **delta.ts 변경**: 챔피언 pickRate/banRate 레코드에 분자(실제 픽/밴 횟수) 기반 표본 정보를
   추가로 실어 verdict 단계에서 참조 가능하게 한다(현재 `n`은 분모라 그대로 두고, 별도 필드 또는
   verdict 쪽 파생 계산 — 설계는 기존 타입/계약 최소 변경으로 판단).
4. **타입 변경**: `MatchStatus`에 `below-threshold` 추가.
5. **UI 반영**:
   - `compare/logic.ts`: STATUS_TABS/COUNTS에 `below-threshold` 반영, `unannouncedCount`는 여전히
     `status==='unannounced'`만 세되 새 버킷은 별도 카운트로 노출(대조표 탭 또는 CoverageBar에
     "임계 미달 N건" 형태로, 기본 접힘/비강조).
   - `StatusBadge.tsx`: `below-threshold` 배지 스타일 추가(unannounced보다 약한 톤).
   - `releaseStream.ts`/`releaseStreamEntity.ts`: `status==='unannounced'`만 쓰므로 자동으로 줄어든
     집합을 받음 — 회귀만 확인.
   - `HeroSummary.tsx`/`logic.ts`: 기존 결함(unannouncedCount가 rows 카운트라 엔티티 단위 151과
     불일치)을 이번 스코프에서 걸리면 **엔티티 단위 카운트로 통일**. 스코프 넘치면 별도 이슈로
     분리하되 최소한 새로 벌어지지 않게 확인.
6. **디스코드 임베드**: `unannounced` 소스만 쓰는지 확인, 걸러진 결과 그대로 반영되는지 확인.
7. **데이터 재생성**: `npm run pipeline:match -- --from 26.16 --to 26.17` 및 `-- --from 26.17
   --to 26.18` 재실행해 `data/aggregated/deltas/*.json` 갱신(Riot API 호출 없음, 커밋된 집계 JSON만
   읽음). 재생성 후 실측 결과(미공지 건수 26.16→26.17이 277→약 30 근방인지, below-threshold 건수)를
   최종 보고에 포함.
8. **기존 테스트 갱신**: `verdict.test.ts`(assignStatus 케이스 추가/수정, 삭제 금지),
   `stats.test.ts`(새 헬퍼 커버), `delta.test.ts`, `logic.ts` 관련 컴포넌트 테스트. TDD로 새
   헬퍼/판정 함수 테스트 먼저 작성.
9. **문서 갱신**: PLAN/verify-spec에 이번 변경 근거(효과크기 바닥 도입 사유, 제로섬 메커니즘,
   Set B 수치, 아이템 상대기준) 반영.

### 실측 근거 (요구사항의 출처 — 재조사 불필요)
- 26.16→26.17 delta(1966행): unannounced 277건 중 84%(232건)가 pickRate/banRate. |delta| 중앙값
  0.76%p, 62%가 <1%p.
- 챔피언 픽률 델타 전체합 = 0.00%p — 픽은 경기당 고정 슬롯(제로섬)이라 한 챔피언 상승이 다수
  챔피언의 강제 하락으로 상쇄되고, 그 하락분이 n=10,000에서 개별적으로 "유의"하게 잡혀 전부
  unannounced로 계상됨. 밴률 델타 전체합 = 4.50%p(완전 제로섬은 아니나 유사 경향).
- 아이템 채택률 베이스가 2~6%로 낮아 절대 %p 바닥을 쓰면 38건 미공지 사례가 거의 전멸(최대
  +0.92%p) → 상대변화 기준 필요.
- 26.17→26.18(표본 n=5,000, 절반)은 unannounced 390건으로 오히려 증가 — 표본이 작을수록 문제가
  악화되는 방증.

## ② 확정 제약 · 거부 사항

### 스코프 제외 (이번에 하지 않음)
- LLM `causes[].verified===true`로 설명되는 unannounced 22건을 5번째 status(`indirect-effect`)로
  분리하는 것 — **별도 트랙에서 /plan만 진행 중.** 이번 계획에 병합 금지. 단 `below-threshold`
  추가가 나중 `indirect-effect` 추가와 충돌하지 않는 구조로 설계할 것(→ ③ ST-EF2 status-order.ts).
- 연속 지표(골드/오브젝트시각/경기시간) 효과크기 바닥 조정.
- `FDR_ALPHA` 값 자체 변경.
- **HeroSummary 엔티티 단위 카운트 통일 — 이번 스코프에서 제외**(사용자 escape hatch 적용, 사유는
  ⑤ 설계 결정 참조). 별도 이슈로 분리, "새로 벌어지지 않았는지"만 확인한다.

### 기술 제약 (고정값)
- 신규 의존성 추가 금지(SCOPE §3). `any` 금지, `strict:true`. 도메인 타입은 `types.ts` 단일 정의.
- 디자인 토큰: 신규 CSS 변수·arbitrary 값 추가 없이 기존 `--border-soft`/`--fg-2`만 조합.
- `data/raw/*` 커밋 금지. `data/aggregated/*` 커밋 대상.

### 요구사항 대비 **의도적 편차** (acceptance-critic 필독 — 아래는 누락이 아니라 설계 결정이다)
1. **요구사항 2 "isSignificant()에 바닥 체크 추가" → 문자 그대로 구현하지 않음.**
   `verdict.ts:42-47` 구조상 `isSignificant()`를 false로 만들면 델타가 else 분기로 떨어져
   `hasNote`인 경우 `announced-inconsistent`가 된다 → 픽/밴 |Δ| 중앙값 0.76%p vs 바닥 2~3%p이므로
   **정상적으로 공지된 변화 34건(announced-consistent)이 "공지-불일치"(danger)로 뒤집히는** 회귀가
   발생한다. 사용자 원문의 요구("바닥 미달인 델타는 unannounced로 승격시키지 말고")를 만족하려면
   바닥은 **"짝 없음" 분기에만** 걸어야 한다. 따라서 `isSignificant()`는 순수 통계 판정으로 유지하고
   `assignStatus`의 `!hasNote` 경로에서만 `meetsEffectFloor()`를 적용한다.
   → 부수효과: `src/pipeline/shared/significance.ts`의 `isSignificantDelta`와 의미가 계속 일치하므로
   **그 파일은 변경하지 않는다**(below-threshold 행이 "유의 변화 M건"에 계속 포함되는 것은 사용자
   정의 "실제로 유의하지만 무시 가능한 규모"와 일치).
   → 기계적 판별: 재생성 후 `announced-consistent`(34)·`announced-inconsistent`(208)가 불변이어야
   한다. 움직였다면 바닥이 잘못된 분기에 걸린 것이다.
2. **요구사항 3 "분자 필드" → 파생 계산 채택, 필드 추가 기각.**
   사용자가 "별도 필드 또는 verdict 쪽 파생 계산 — 기존 타입/계약 최소 변경으로 판단"으로 위임했다.
   `champions.ts:46,64`·`items.ts:34` 확인 결과 `Math.round(rate × 분모)`가 분자를 **무손실 복원**
   한다(`delta.ts:287`이 이미 같은 역산 사용). 소비자 없는 필드를 `DeltaRecord`에 추가하면 커밋
   대상 JSON 약 3,900행의 스키마가 바뀌므로, `stats.ts`에 `proportionNumerator()` 순수 헬퍼를 두고
   `verdict.ts` 주석에 복원 방법을 명시하는 것으로 "verdict 단계에서 참조 가능"을 충족한다.
3. **요구사항 5 "releaseStream 회귀만 확인" → 조건부 코드 수정 포함**(ST-EF8). 미공지 그룹 수 U가
   노트 그룹 수 M+1 미만이 되면 `releaseStream.ts:106`의 배분식이 슬롯 0에 0건을 배정해, 그 파일
   자신이 :93-95에서 단언한 불변식("스트림 최상단은 |delta| 최대 미공지로 시작")과 HANDOFF §1-1
   수용 기준이 깨진다. 실측 후 해당 시에만 최소 보장을 넣는다.
4. **요구사항 7 "재생성은 커밋된 집계 JSON만 읽음" → 26.17→26.18은 무손실이 아니다.**
   `buildDeltas`는 `data/raw/{to}/matches.jsonl`에서 `evidence.matchIds`를 뽑는데(`delta.ts:675`),
   `data/raw`는 gitignore이고 로컬에 26.18이 없다. 현재 `26.17_26.18.json`은 1,927행 중 1,912행이
   matchIds를 갖고 있으므로 그냥 재생성하면 전부 유실된다(CLAUDE.md "모든 판정문은 원천 링크를
   가진다" 위반). → ST-EF7에서 carry-over를 구현한 뒤 재생성한다(사용자 승인 항목 — 메인 세션이
   책임지고 승인함, 근거는 아래 「메인 세션 결정 사항」).

## 메인 세션 결정 사항 (--auto 진행 중 즉결 판단, 사유 명시)

1. **ST-EF7 carry-over 구현 — 승인.** 대안(재생성 보류)은 사용자가 요청한 수정(요구사항 7)이 실제
   배포 화면(26.17→26.18은 사이트가 렌더하는 최신 쌍)에 전혀 반영되지 않는다는 뜻이라 요구사항
   불이행과 같다. carry-over는 스코프 확대가 아니라 기존 CLAUDE.md 불변식("모든 판정문은 원천
   링크를 가진다")을 새로 어기지 않기 위한 필수 보강으로 판단해 진행한다.
2. **아이템 상대기준 최소 분자 가드 — 미적용.** 사용자가 승인한 Set B를 넘는 신규 정책이므로
   이번엔 넣지 않는다. 재생성 결과에서 극저베이스 아이템이 실제로 살아남으면 별건으로 보고한다.
3. **HeroSummary 엔티티 단위 통일 — 연기.** 원 요구사항의 escape hatch("스코프 넘치면 별도 이슈로
   분리") 그대로 적용.

## ③ SubTask 목록

| id | 설명 | 파일 | TDD |
|---|---|---|---|
| ST-EF1 | 효과크기 바닥 상수(`EFFECT_SIZE_FLOORS`) + `meetsEffectFloor()` + `proportionNumerator()` | `src/pipeline/aggregate/stats.ts`, `__tests__/stats.test.ts` | ✅ |
| ST-EF2 | `MatchStatus`에 `below-threshold` 추가 + 상태 순서 단일 소스 신설 | `src/pipeline/types.ts`, `src/pipeline/shared/status-order.ts`(신규) | — |
| ST-EF3 | `assignStatus` 짝없음 분기에 바닥 적용 + `STATUS_SORT_PRIORITY` 임포트 전환 | `src/pipeline/match/verdict.ts`, `__tests__/verdict.test.ts` | ✅ |
| ST-EF4 | 26.16→26.17 델타 재생성 + 수치 게이트 | `data/aggregated/deltas/26.16_26.17.json` | — |
| ST-EF5 | 필터칩·대표상태(indexOf→우선순위 Map)·커버리지 버킷 | `src/components/compare/logic.ts`, `__tests__/logic.test.ts` | ✅ |
| ST-EF6 | 뱃지·라벨·커버리지바·방법론 정의표 | `StatusBadge.tsx`, `format.ts`, `CoverageBar.tsx`, `StatusDefinitionTable.tsx`, `methodology/page.tsx`, `format.test.ts` | — |
| ST-EF7 | raw 부재 시 evidence.matchIds 승계 + 26.17→26.18 재생성 | `scripts/run-match.ts`, `src/pipeline/match/delta.ts`, `__tests__/delta.test.ts`, `data/aggregated/deltas/26.17_26.18.json` | ✅ |
| ST-EF8 | U<M+1이면 슬롯0 최소1건 보장(조건부) | `src/components/home/releaseStream.ts`, `__tests__/releaseStream.test.ts` | ✅ |
| ST-EF9 | 문서 갱신 | `docs/plan/PLAN-patchgap.md`, 본 파일, `verify-spec/ST-EF*.md`, `DESIGN-TOKENS.md` | — |
| ST-EF10 | tsc/eslint/vitest/build 개별 실행 + 회귀 확인 + 커밋 준비 | — | — |

## ④ 라우팅 판정

git ✅ / verify.sh ✅(`--ts-only` 지원) / 독립 `[P]` 후보 3개 < 4 → **전량 `[S]`**, team-dev 위임 없음.

## ⑤ 설계 명세 · Ground Truth

- `docs/design/DESIGN-TOKENS.md` §"상태 색 문법(구현 불변식)" — 신규 토큰 0, `border-border-soft
  text-fg-2` 조합, 라벨 "임계 미달". `unannounced`보다 약하고 `no-change`보다 강한 중간 단계.
- 매칭 prototype: 전부 기존 화면 수정 → `/frontend-design` 호출 불필요.

## ⑥ 완료 조건 (수치)

26.16→26.17 재생성 후 `meta.counts`: `unannounced` 20~35 · `unannounced+below-threshold`=277(불변
총량) · `announced-consistent`=34(불변, 설계정정 검증용) · `announced-inconsistent`=208(불변) ·
`insufficient-sample`=585(불변) · `no-change`=862(불변) · `meta.n`=1966(불변).

검증: `npx tsc --noEmit` / `npm run lint -- --max-warnings 0` / `npm run test` / `npm run build`
개별 실행(verify.sh --full 금지, OOM 이력). 실패 시 2회 상한 후 보고.

## ⑦ 병렬 트랙 통보

LLM 2단 타깃(`unannounced`/`announced-inconsistent` 상위 50건)에서 below-threshold가 빠지므로
재생성 후 `causes[].verified===true` 집합이 달라진다 — 병렬 진행 중인 `indirect-effect` 트랙의
기준선(22건)이 바뀐다.
