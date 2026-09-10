# PLAN — UX 개편 구현 (2026-09-10)

## 1. 사용자 요구사항 원문

> "docs/design/HANDOFF-redesign-2026-09-10.md 읽고 UX 개편 구현 착수해줘"
> "/sh-dev-loop --tdd --auto"

기준 문서: `docs/design/HANDOFF-redesign-2026-09-10.md`(확정 인수인계, 2026-09-10). 이 PLAN은 그 문서의 §1~§8을 구현 계획으로 분해한 것이며, 요구사항 원문은 HANDOFF 문서 자체다(요약하지 않음, 해당 파일이 기준선의 일부).

## 2. 확정 제약 (HANDOFF §1, §6 — 위반 시 실패)

1. 첫 화면은 "괴리"로 읽혀야 한다 — 노트 행마다 관측 판정, 미공지는 같은 스트림에 accent 좌측 레일로 삽입. 수용 기준: 상단 스크린샷만 보고 "패치노트 요약 사이트"로 오인되면 실패.
2. 상태 색(`--accent`·`--danger`·`--warn`·`--success`)은 게임이 바뀌어도 불변. `[data-game]` 블록에서 재정의 금지.
3. 근거 없는 문장은 `--muted`. LLM이 후보를 못 찾으면 "근거 없음"을 그대로 노출.
4. Riot 로고·상표 사용 금지.
5. **하지 말 것**: 라인별 밴률 컬럼(포지션 행 `banRate`는 `null`) / PUBG 실연결 / 챔피언 스플래시를 콘텐츠 배경으로(히어로 한정) / 게임별 상태색 재정의.

## 3. 사용자 확정 결정 (승인 게이트에서 확인, 2026-09-10)

| 쟁점 | 결정 |
|---|---|
| PUBG 중립 램프·게임 스위처 UI | **제외**. ST-A는 `[data-game]` 오버라이드 계약(중립8+워시2만 덮어쓰기)만 DESIGN-TOKENS.md에 문서화. 램프·스위처 UI 출하하지 않음 |
| `HeadlineStats.noteItemCount` 오라벨 | **리네임**. `noteEntityCount`(엔티티 수)/`noteItemCount`(meta.itemCount)로 분리 — `methodology/pipelineSteps.ts` 기존 컨벤션에 정합 |
| 대조표(compare) 동일 오라벨(`CoverageStats.noteItemCount`) | **함께 수정**. ST-I에 동봉(HANDOFF 명시 범위 밖이나 같은 결함 클래스) |

## 4. SubTask 목록 + 라우팅

전제: git ✅ · verify.sh ✅(`--full`/`--no-build`/`--ts-only` 전부 지원) · `[P]` 후보(ST-B·C·D·E, 독립 파일+독립 기능) 4개 ≥ 임계값 → 해당 그룹만 `/team-dev` 위임, 나머지 `[S]` 인라인.

```
[Task] UX 개편 — V4 팔레트 + 릴리즈노트 프레임 홈 + 아이콘/라인축 투입   라우팅: 병렬 4 + 직렬 9

  [S] ST-A: V4 협곡 나이트 팔레트 교체 (전 화면 선행 의존, 최우선 단독 실행)
    → docs/design/DESIGN-TOKENS.md, src/styles/tokens.css, src/app/globals.css
    → docs/design/prototype/{01-briefing-home,02-comparison-table,03-item-detail,04-methodology}.html (:root만)
    → CLAUDE.md (네임스페이스 열거 갱신)
    → seed 파일(docs/design/seed/catalog-tokens.css)은 verbatim 보존, 헤더 주석으로 "색 램프=patchgap 소유/비색 토큰=seed verbatim" 경계 명시
    → [data-game] 오버라이드 계약만 문서화(중립8+워시2), 램프 미출하

  [P] 그룹 (team-dev 위임, ST-A와 동시 진행 가능 — 파일 겹침 없음):
    ├── ST-B: [TDD] 릴리즈노트 스트림 조립 로직 → src/components/home/releaseStream.ts (+test)
    ├── ST-C: [TDD] 라인 축 파싱 + 라인별 미공지 분포 집계 → src/lib/lane.ts (+test), src/components/home/laneDistribution.ts (+test)
    ├── ST-D: [TDD] skill 문자열→스펠 아이콘 파일명 매핑 → src/pipeline/match/spell-icon.ts (+test), 픽스처 2종
    └── ST-E: [TDD] CI→오차막대 오프셋 매핑 → src/components/item/chartData.ts (수정, +test)

  [S] 체인 (ST-B~E 완료 후 순차, ST-A와도 합류):
    ├── ST-F: 스펠 아이콘·스플래시 자산 파이프라인 (ST-D 소비) → scripts/run-ddragon.ts, src/pipeline/types.ts, src/lib/data.ts, data/aggregated/spell-icons.json, public/dd/spell/*.png·splash/*.jpg
    ├── ST-G: 공용 프레젠테이션 컴포넌트 → src/components/LaneGlyph.tsx, src/components/SpellIcon.tsx
    ├── ST-H: 홈 릴리즈노트 스트림 렌더 + 라인 필터 6종 (§1-1 수용기준 직결, 절단 불가) → src/components/home/{ReleaseNoteStream,ReleaseNoteRow,LaneFilter}.tsx, src/app/page.tsx, (삭제) UnannouncedList.tsx·NotePreviewList.tsx
    ├── ST-I: 헤드라인 수치 정정(엔티티/항목 분리 리네임, 홈+대조표 동봉) + 라인별 미공지 분포 패널 + 히어로 앰비언트 → src/components/home/logic.ts, HeroSummary.tsx, LaneGapPanel.tsx(신규), HeroAmbient.tsx(신규), src/components/compare/logic.ts, CoverageBar.tsx
    ├── ST-J: 대조표 아이콘 투입 + 라인 글리프 박스 + 라인 태그 → src/components/compare/{DeltaTable,NoteNavigator,logic}.tsx
    ├── ST-K: 항목 상세 CI 오차막대 렌더 + 레이아웃 재배치 + 헤더 아이콘 72px → src/components/item/ItemChart.tsx, src/app/item/[id]/page.tsx
    ├── ST-L: 방법론 어댑터 매핑표 → src/components/methodology/{adapterMatrix.ts,AdapterMatrix.tsx}(신규), src/app/methodology/page.tsx
    └── ST-M: Ground Truth 문서 정합 → docs/design/UX-BRIEF.md
```

절단 우선순위(일정 압박 시): ST-H는 §1-1 수용 기준 직결이라 절대 불가. 자를 후보는 ① 히어로 앰비언트(ST-I 일부) ② 라인 필터 인터랙션(ST-H 축소, "전체" 고정) 순.

## 5. UI/UX 설계 명세 경로

- Ground Truth: `docs/design/DESIGN-TOKENS.md`(팔레트, ST-A가 갱신) / `docs/design/UX-BRIEF.md`(화면 명세, 01/03 항목은 HANDOFF가 상위 — ST-M에서 정합) / `docs/design/prototype/*.html`(레이아웃 유효, 팔레트만 ST-A에서 교체)
- `/frontend-design` 호출: 불요(4개 화면 모두 기존 화면 수정, 신규 미매칭 화면 0건)
- 세부 레이아웃·인터랙션·접근성 명세는 HANDOFF §4 원문 + planner 산출 설계 명세(본 계획 수립 시 planner 에이전트 출력, 2026-09-10) 준수

## 6. 검증 기준 (HANDOFF §7)

- `bash verify.sh --full` (기존 테스트·public 시그니처 유지)
- `/design-lint` — `D-COLOR-02`=error, 소스 하드코딩 색 0
- 대비: 본문 4.5:1 · 비텍스트 3.0:1 (HANDOFF §2 표 + 미계측 4토큰: `--success`·`--surface-warm`·`--border-soft`·`--accent-on`)
- 렌더 확인: `getComputedStyle` 계측 우선(스크린샷 툴은 공유 Chromium 경합으로 신뢰도 낮음)

## 7. 미확인 사항 / 갱신 이력

- 최초 작성: 2026-09-10, planner 위임 산출 + 사용자 승인 3건 반영
- **갱신 2026-09-10 (verify-impl 축B 후속)** — 확정 시안 아티팩트를 실제 렌더와 대조한 결과 ❌ 5건이 나와 아래처럼 계획을 고쳤다. 근거·측정치는 `docs/plan/VERIFY-IMPL-ux-redesign-2026-09-10.md`.
  - **ST-B 순서 계약 변경(기준선 결함)** — 최초 계약은 "미공지를 스트림 **상단에** 삽입"이었으나 시안은 "노트 순서 그대로 + 그 자리에 끼워 넣기"다. 구현은 계획대로였고 **계획이 시안과 어긋나 있었다.** 균등 분산(M+1 슬롯 floor 배분)으로 교체 — `aceb391`(RED) → `42a7dab`(GREEN). 인과 앵커(`candidateNoteId`)는 시안에 없는 메커니즘이라 채택하지 않음.
  - **ST-H 보강** — `.rn-obs`(엔티티 대표 관측 1줄)·`.verdict .m`(스킬 행 판정 근거 1줄) 신설, `.gap-why`를 엔티티당 1회로 이동 → `src/components/home/streamVerdict.ts`(신규) + `42a7dab`.
  - **ST-J 보강** — 대조표 라인 필터 신설(시안 `.m-filter`). `filterByLane`은 밴률을 구조적으로 배제해 §6을 별도 분기 없이 만족 → `77faae8`. `LaneFilter`는 홈·대조표 공용이 되어 `components/home/` → `components/`로 이동.
  - **ST-L 재작성** — 4열을 "PUBG 상태" → "어댑터 인터페이스"로 교체하고 판정 엔진을 표 밖 문단에서 **9번째 행**으로 이동(시안 "마지막 행이 핵심") → `da88547`. 상태 표기는 PUBG 열 머리글 1회로 접었다.
  - **접근성 부수 수정** — `LaneGlyph`에 `labelled` prop 추가. 인접 텍스트가 라인명을 이미 말하는 호출부 4곳에서 접근명이 "탑탑"·"원딜바텀"으로 중복 낭독되던 것을 제거 → `77faae8`.
- **잔여(이번 범위 밖, 결정 필요)**
  - **라인 어휘 이원화** — 필터·태그는 `format.ts` SSOT의 "원딜/서포터", 델타 파이프라인이 만든 라인 엔티티명은 "바텀". 시안은 "바텀/서폿"이다. UI 레이어만으로는 못 고친다(엔티티명은 `writeDeltas` 산출) → 파이프라인 라벨까지 함께 바꿀지 결정 필요.
  - **항목 상세 범례 CI 실측값 병기**(시안 `[46.3, 48.2] · [33.3, 35.2]`), **패널 배치**(시안 좌=차트 / 우=게이트·대조) — 둘 다 ⚠️ 수준.
  - **홈 스트림의 라인 엔티티 아이콘** — `resolveStreamEntityIcon`이 `entityType: "lane"`을 돌려주지만 `EntityIcon`에 라인 분기가 없어 첫 글자 박스("바")가 뜬다. 대조표는 ST-J의 `RowIcon`이 라인 글리프 박스로 이미 교체했으므로 같은 화면군 안에서 표기가 갈린다 — 시안 04의 인라인 미공지 예시가 전부 챔피언이라 대조할 시안 셀은 없다. `RowIcon`과 같은 모양의 수정 1건.
  - **미공지 인과 앵커** — `candidateNoteId` 보유 14개 그룹을 해당 노트 옆에 배치하면 "그 자리"의 의미가 강해진다. 시안엔 없는 확장이라 별건.
