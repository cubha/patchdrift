# PLAN — 패널/크롬 리디자인 (Q1~Q4 + .ambient-duo 수정) — 2026-09-12

## 사용자 요구사항 (원문 — 요약 금지)
직전 턴에서 사용자가 방향 제안 아티팩트(패널·크롬 리디자인 방향,
https://claude.ai/code/artifact/96d308cc-4b52-4d0f-b8a8-2de311ece020)의 **권장안 전건**을
승인했고, 이번 턴 지시는 "우선 전건 권장방향으로 /sh-dev-loop --tdd --auto 진행해줘"였다.

아티팩트가 제시한 결정 사항(Q1~Q4, 전부 "권장" 선택됨):

1) [Q1 — 상단 크롬 통합, 안 N2] `src/components/FilterBar.tsx`를 헤더(`src/components/Header.tsx`)와
   통합한다: 패치 쌍만 실제 드롭다운으로 남기고(현재 옵션은 `listPatchPairs()`가
   `data/aggregated/deltas/*.json` 파일명에서 유도 — 실측 결과 2개: 26.16→26.17, 26.17→26.18),
   고정 표본(KR·Master+·솔로/듀오)은 비활성 드롭다운이 아니라 읽기전용 메타 칩으로 표시한다.
   크롬은 총 1줄로 줄인다(현재 헤더+필터바 2줄 144px). `src/components/AmbientBackground.tsx`/
   `src/styles/ambient.css`의 마스크·앵커 좌표는 크롬 높이가 줄어든 만큼 재보정 확인.

   patchHref 배선에 대한 중요 사실(직접 확인 완료, 재조사 불필요): `next.config.ts`는
   `output:'export'`이고 `src/app/`에는 패치 쌍별 정적 라우트가 존재하지 않는다 —
   `generateStaticParams`는 `item/[id]/page.tsx`에만 있고 그것도 델타 레코드 슬러그 기준이지
   패치 쌍 기준이 아니다. 홈(`/`)과 대조표(`/compare/`)는 항상 `getDefaultPair()`
   (= `listPatchPairs()[0]`)만 렌더한다. 즉 패치 쌍을 바꿔서 이동할 다른 라우트 자체가 없다 —
   사용자 원 지시("우선 홈과 대조표만 자기 자신으로의 이동... 또는 실현 가능한 범위로 배선,
   과도한 라우팅 인프라를 새로 만들지 말 것")에 따라 새 라우트를 만들지 않는 것이 맞다.
   따라서 이 SubTask의 실현 가능한 범위는: pairs.length가 1 초과일 때만 select를 활성화하고
   그 자체는 표시/향후 확장 대비로 남기되, "곧 여러 패치 쌍을 브라우징하는 기능이 생기면 그때
   실제 이동 경로가 붙는다"는 취지로 문서화한다. 새 라우트/새 페이지 생성은 이번 스코프에 없음.

2) [Q2 — 패널 트리트먼트, A+B 결합] 골드 4변 프레임(현재 `SectionCard.tsx` 등이 쓰는 `--border`
   전체 테두리 + `elev-ring`)을 걷어내고, 상단 2px 골드 그라디언트 레일(A) +
   surface-warm→surface→더 어두운 바닥의 깊이 그라디언트 채움(B)으로 교체한다. 본문 대비(수치 표
   가독성)는 건드리지 않는다 — 채움은 배경색 자체를 그라디언트로 바꾸는 것이지 알파를 낮추는 게
   아니다(투명도 변경 없음, 완전 불투명 그라디언트). 토큰 추가는 기존 `--glass-*` 작업과 같은
   순서: `docs/design/DESIGN-TOKENS.md` 먼저 갱신 → `src/styles/tokens.css`로 복사. 신규 토큰명은
   `--panel-fill-from`/`--panel-fill-via`/`--panel-fill-to`, `--panel-rail` 계열.
   `SectionCard.tsx`가 대부분의 패널을 그리므로 그 컴포넌트 위주로 교체하고, 유사 마크업을 직접
   쓰는 다른 곳(`HeroSummary.tsx`의 스탯 3분할 section 등)도 같이 맞춘다.

3) [Q3 — 항목상세 레이아웃, 안 L1] `src/app/item/[id]/page.tsx`의 콘텐츠 폭을 그 페이지에서만
   1040px 중앙 정렬로 좁힌다(전역 `Container`는 건드리지 않음). 구현 방법은 `Container`에 폭
   오버라이드 prop 추가 vs 페이지 자체 wrapper 중 기존 패턴에 맞는 쪽으로 판단.

4) [Q4 — 상세 헤더를 배경 위로] `item/[id]/page.tsx`의 헤더 섹션(약 165행 부근 불투명 `bg-surface`
   카드)을 홈 히어로(`HeroSummary.tsx`, 2026-09-12 전례)와 같은 방식으로 카드 밖 배경 위 텍스트로
   뺀다. `text-shadow`는 `.ambient-hero-headline`/`.ambient-hero-sub` 패턴을 재사용하거나 유사
   클래스 추가. 벗긴 뒤 Playwright로 픽셀 휘도 계산 → 최악 지점 대비 확인(AA 미달이면 색 토큰 상향).

+ 공통 버그 수정 (모든 안에 필수): `src/styles/ambient.css`의 `.ambient-duo`를 시안
  (`rift-bg-v5.html` `.duo`) 파라미터로 맞춘다 — `background:#0a1626` 추가(블렌드 바탕, 현재 없음
  → `mix-blend-mode:screen`이 투명 배경과 합성돼 형체가 거의 사라지는 게 "안 보인다"의 실제 원인
  — 4개 중 가장 결정적) / `width:62%`(현재 `min(560px, 46vw)`) / 마스크 중심 `at 62% 30%` →
  `at 68% 44%`. 항목상세 폭이 1040px로 좁아지면 46vw 기준값이 무의미해지므로 Playwright 실측 후
  IMPL에서 판단.

## 확정 제약 / 명시 거부 사항
- 배경 테마 레이어 1~4(아이소메트릭 섬 앵커·라인 카메라·인트로 리빌·상세 스플래시)는 구현·검증
  완료 — 이번 스코프는 그 **위** 크롬/패널/레이아웃에 한정. 레이어 1~4 로직 변경 없음.
- 패치 쌍별 신규 라우트/페이지 생성 금지(사용자 원문 명시).
- 데이터 패널 반투명화는 이전 라운드 기각(대비 재측정 필요·시안도 불투명 유지) — Q2 채움도
  **알파를 낮추지 않는다**(완전 불투명 그라디언트만).
- 홈 릴리즈노트 스트림·라인 필터·인트로 리빌 등 검증된 기능 로직 변경 금지.
- `compare/CompareExplorer.tsx`의 자체 필터 바는 Q1 대상 아님(필터가 실제로 동작함).
- prototype HTML 4장 재작성 안 함 — 2026-09-12 `.topbar` 선례(컴포넌트 주석 + DESIGN-TOKENS.md
  갱신으로 이탈 기록)를 따른다. 단 UX-BRIEF §3의 구조적 주장은 갱신한다.

## SubTask (라우팅: 전량 [S] — 독립 후보 2개 < 4 임계값)
| ID | 내용 | 파일 | TDD |
|---|---|---|---|
| ST-PC1 | `.ambient-duo` 시안 4파라미터 이식(`background: var(--surface)` 포함) | `src/styles/ambient.css:147-156` | — |
| ST-PC2 | `--panel-*`/`--container-narrow` 토큰 + `panel.css` + 기준선 문서 | `docs/design/DESIGN-TOKENS.md`, `docs/design/UX-BRIEF.md`, `src/styles/tokens.css`, `src/styles/panel.css`(신규), `src/app/globals.css` | — |
| ST-PC3 | 패널 6곳 `.panel-surface` 교체 | `SectionCard.tsx:25`, `home/HeroSummary.tsx:48`, `home/ReleaseNoteStream.tsx:55,60`, `compare/NoteNavigator.tsx:42`, `compare/CompareExplorer.tsx:107` | — |
| ST-PC4 | `Container` `width?: "default"\|"narrow"` + 항목상세 적용 | `Container.tsx`, `app/item/[id]/page.tsx:163` | — |
| ST-PC5 | 상세 헤더 카드 밖으로 + `.ambient-detail-*` | `app/item/[id]/page.tsx:164-207`, `src/styles/ambient.css` | — |
| ST-PC6 | 크롬 1줄 통합 + `FilterBar` 삭제 | `Header.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/compare/page.tsx`, `FilterBar.tsx`(삭제) | — |
| ST-PC7 | 앰비언트 재보정 + 대비 실측 5건(Playwright) | `src/styles/ambient.css`, `src/styles/tokens.css`(미달 시) | — |
| ST-PC8 | 실측 반영 문서 재갱신 + `verify.sh --full` | `DESIGN-TOKENS.md`, 본 PLAN | — |

**[TDD] 0개 — `--auto --tdd`에서도 적격 없음(게이트 정상 동작).** ST-PC1~6은 UI/CSS 절대제외,
ST-PC7은 Playwright(E2E 계열) 절대제외, ST-PC8은 단위러너 부재. 검토 후 기각한 유일 후보:
`FilterBar.tsx:69-76` 캡션 조립 로직의 `chromeMeta.ts` 추출 — (a)(b) 통과, **(c) 비자명 탈락**
(조건부 push 2개 + join + findIndex). 대조: `src/lib/laneCamera.ts`가 TDD를 받은 것은 시안 실측
fx/fy/z 표의 비자명 매핑이었기 때문이다(PLAN-ambient-terrain-bg §구현) — 이 프로젝트가 pure
모듈을 전부 TDD하는 것이 아니다.

## 신규 토큰 (값 + 불변식)
`:root` 내 `--glass-*` 바로 아래, patchgap 소유 주석 블록으로 분리. 혼합은 `in srgb` 고정.
- `--panel-fill-from: color-mix(in srgb, var(--surface-warm) 70%, var(--surface))` ≈#101e34, L=0.0129
- `--panel-fill-via: var(--surface)` #0a1626, L=0.0078
- `--panel-fill-to: color-mix(in srgb, var(--surface) 72%, var(--bg))` ≈#081322, L=0.0063
- `--panel-rail-from: var(--border)` / `--panel-rail-via: color-mix(in srgb, var(--border) 55%, transparent)` / `--panel-rail-to: transparent`
- `--container-narrow: 1040px`

**불변식 ①** L(`--panel-fill-from`) ≤ 0.0141 → `--muted`(#8b8677) 대비 ≥ 4.5:1.
`--surface-warm` 원값(L=0.01523)은 **4.42:1로 AA 미달**이라 그대로 쓸 수 없다. 계산 방법은
`--muted`/`--surface`=5.00:1(DESIGN-TOKENS.md 94행 기재값)로 캘리브레이션 검증됨.
**불변식 ②** L(`--panel-fill-to`) > L(`--bg`)=0.0037 — 바닥이 페이지 배경보다 어두워지면
"떠 있는 카드"가 "파인 홈"으로 뒤집혀 깊이 그라디언트 의도와 반대가 된다.

**기각: "eyebrow를 `--muted`→`--fg-2`로 상향" 단독 처방** — `SectionCard` head만 덮는다.
2레이어 background에서 fill은 가시 프레임 전체에 그려지므로 `ReleaseNoteStream` 스크롤 행의
`--muted` 서브라벨도 warm 밴드를 통과한다 → 토큰 클램프가 필수이고 색 상향은 대체재가 아니다.

**레일은 `--border` 단독(`--accent` 아님)** — 아티팩트의 "골드"는 DESIGN-TOKENS.md 95행이
`--border`로 정의한 것이고, `--accent`는 97행이 상태·링크·버튼 전용으로 못 박았다.
`ReleaseNoteStream` 미공지 그룹이 이미 accent 좌측 레일을 의미 신호로 쓰므로, 6패널 상단 accent는
같은 x대에 수직 정렬돼 혼동을 만든다. 그라디언트는 색이 아니라 알파로 만든다.

**`--container-narrow`는 seed 경계 신규 비-색 토큰** — ①추가는 값·이름 변경이 아니다
②`docs/design/seed/catalog-tokens.css`는 건드리지 않는다(벤더 프로베넌스) ③patchgap 소유 주석
블록으로 분리. `--border` **용도열만** 갱신하고 「사용」열(✓=프로토타입 참조)은 유지한다.

## UI 설계 명세 / Ground Truth 경로
- `docs/design/DESIGN-TOKENS.md` · `docs/design/UX-BRIEF.md` §3
- `docs/design/prototype/{01-briefing-home,02-comparison-table,03-item-detail}.html`
- 확정 시안 `rift-bg-v5.html` `.duo`/`.topbar`/`.patchpill`/`.tiles`/`.list`/`.card`/`.detail`
- `/frontend-design` 호출 없음 (분기 A 전부 매칭 — 신규 화면 0)

## Q2 비대상 (누락 판정 방지 — 의도적 제외)
컨트롤·아이콘 박스는 `border-border` 유지: `EntityIcon.tsx:45` · `compare/DeltaTable.tsx:24` ·
`home/ReleaseNoteRow.tsx:44,54` · `compare/NoteNavigator.tsx:75,101` ·
`methodology/PipelineDiagram.tsx:21` · `compare/StatusFilterChips.tsx:27`.
`app/item/[id]/page.tsx:164`는 ST-PC5가 삭제하므로 Q2 대상이 아니다.

## 설계 근거 (핵심 결정)
- **항목상세 chrome의 잘못된 쌍 주장 차단**: `findDeltaForId`(item/[id]/page.tsx:77)는 id를 가진
  첫 쌍을 쓰므로, 쌍이 2개인 현 데이터에서 26.16→26.17 항목을 열면 `getDefaultPair()` 기반
  chrome이 26.17→26.18의 n·집계를 표시한다(「모든 판정문은 원천 링크를 가진다」 위반).
  처방: **쌍 비소유 라우트(`/item/*`·`/methodology/`)에서 패치 쌍·n·집계를 렌더하지 않는다.**
  `usePathname()`이 이미 있어 비용 0. `AmbientProvider` 경유 대안은 범위 확대로 기각.
- **`스냅샷`/`집계` 캡션 중복 제거 = 의도적 추가(아티팩트 미기재)**: 1줄 폭 압박이 근거.
  현재 두 값은 동일하지만 소스가 다르다 — `listPatches()`는 `{patch}/summary.json`,
  `listPatchPairs()`는 `deltas/*.json` 기준이라 **aggregate 완료·match 미완 구간에서 갈라진다.**
  그래서 합치지 않고 라우트별로 분기한다.
- **background 2레이어(레일+채움), `::before` 금지**: `ReleaseNoteStream.tsx:60`이 자기 자신이
  스크롤 컨테이너라 절대배치 `::before`는 콘텐츠와 함께 스크롤해 사라진다. `background`는
  기본 `background-attachment: scroll`로 border box 기준 고정이다. `background-origin`
  기본값(padding-box)에 의존하고 `background-clip`은 설정하지 않는다.
  **의도된 부수효과**: 그 패널 fill은 스크롤 높이가 아니라 가시 프레임 높이에 맞춰 그려진다
  (프레임 vignette). `background-attachment: local`로 "고치면" 레일까지 스크롤한다 — 금지.
- **Q3은 이전 기각과 충돌 없음**: 「전역 Container 폭 축소」 기각 사유가 "대조표·방법론·
  항목상세까지 같이 좁아지는 부작용"이었고 이 안은 항목상세 단일 라우트 한정이다. 부수 이득:
  1440px에서 우측 여백 60px→200px로 duo 스플래시 가시 면적 증가.
- **Q2는 시안 복귀 + 추가**: 시안 패널(`.tiles`/`.list`/`.card`/`.note`)은 전부
  `border:1px solid var(--border-soft)` + `background:var(--surface)`이고 골드 4변 프레임은
  애초에 시안에 없었다. 걷어내는 것은 골드(`--border`+`--elev-ring`)이며 border-soft hairline은
  유지한다.
- **`--elev-ring`은 dead token 아님**(design-lint 대상은 prototype HTML), **`--glass-chrome-2`도
  살아남음**(`CompareExplorer.tsx:84`).

## 시안 대조 — ST-PC1 채택/비채택
채택 4건: `background: var(--surface)`(=시안 #0a1626) · `width:62%` · 마스크 중심 `at 68% 44%`.
비채택(기록): `right:-4%`/`top:-6%`/`height:104%` · 마스크 반경 `60% 76%` ·
정지점 `20%/.52 50%/80%` · `object-position:42% 20%`. 조용히 같이 바꾸면 범위 확대다.
단 `right:-4%`는 ST-PC7에서 duo 최밝점이 aside 컬럼에 완전히 가려진 경우에만 쓰는
**시안 승인 레버**로 보류한다(임의 좌표 발명 금지).

## ST-PC7 실측 항목 (메인 세션, HeroSummary.tsx:12-18 절차 재사용)
1. **홈 히어로 재측정(필수·놓치기 쉬움)** — `.ambient-scrim` 정지점(420/720/960px)과
   `.ambient-camera` 마스크(`ellipse 62% 560px at 50% 0%`)가 뷰포트 상단 기준 절대 px다.
   크롬 -88px이면 히어로가 scrim이 옅고 섬이 밝은 y로 올라가므로, `HeroSummary.tsx:17`의
   "`--fg`면 5.67:1로 전 구간 통과"가 **stale해진다.**
2. 항목상세 신규 헤더 대비(AA 미달이면 색 토큰 상향).
3. `.ambient-duo` 62%를 1040px 컨텍스트에서 재검증(1440×900: 마스크 중심 x≈1211 vs 콘텐츠
   우단 1240).
4. `--panel-fill-from` warm 밴드 위 `--muted` 실측(불변식 ① 검증).
5. 크롬 phone(<768px) 높이 — `flex-wrap` 2줄 여부.

## 미확인 사항
- 실측은 1440×900 / 480×900 2개 뷰포트 기준(기존 관행). 초광폭·태블릿 중간폭 미검증.
- planner는 read-only라 런타임 동작 미확인 — 위 대비 수치는 전부 정적 계산(휘도 공식)이며
  ST-PC7 실측으로 확정해야 한다.

## 라우팅/실행 순서
전량 `[S]` 인라인 순차(독립 후보 ST-PC1·ST-PC2 2개 < team-dev 임계값 4개).
순서: ST-PC1(독립) → ST-PC2(기준선 선행) → ST-PC3(←2) → ST-PC4 → ST-PC5(←4, 같은 파일) →
ST-PC6(독립, ST-PC7 선행) → ST-PC7(←1,4,5,6 전부) → ST-PC8(←7).

이 세션에는 `TaskCreate`/`TaskUpdate` 라이브 추적 도구가 없어(도구 미탑재), SubTask 진행상황은
이 PLAN 파일 갱신과 각 `docs/plan/verify-spec/ST-PC*.md` 작성으로 durable 추적한다.

## 완료 확정 (Phase 3 배치검증 이후, 2026-09-12)
전 SubTask 구현·검증 완료. `bash verify.sh --full` PASS(exit 0). scope-critic 5회(ST-PC1~PC6,
PC4/5 통합 1회) 전부 `DECISION_CHANGED: no`. acceptance-critic 1회 결과 UNMET 2건(모두 경미,
출하 차단 아님) — 아래에서 전부 반영·종결:

- **ST-PC7 재확인**: "AA 미달이면 색 토큰 상향" 처방을 문자 그대로 쓰지 않고 대체 판단(글린트가
  텍스트 여백에 있어 무해)을 내린 것에 대해, acceptance-critic이 "육안 대조는 검증 불가능한
  근거"라고 정당하게 지적 — **무시하지 않고 재검증**했다. 텍스트 표시/숨김 두 스크린샷의 픽셀
  차분으로 "글리프 잉크 픽셀"과 "AA 미달 배경 픽셀" 집합을 구해 교집합을 계산(재현 가능한 절차,
  육안 아님) → **교집합 0건**, 색 토큰 상향이 필요 없다는 원래 판단이 재현 가능한 방법으로
  확정됐다. 상세는 `docs/plan/verify-spec/ST-panel-chrome-redesign-2026-09-12.md`의
  「방법론(글리프-교집합 재검증)」 절.
- **ST-PC8 재확인**: 실측치(--panel-fill-from 위 --muted = 4.61:1)가 계산치(4.59:1)로만 남아있던
  DESIGN-TOKENS.md 131행을 실측값 병기로 갱신. 본 절이 "본 PLAN 갱신" 요건을 충족한다.
- 나머지 UNKNOWN 2건(Q4 대비 실측 수행 여부·`verify.sh` 재통과 여부)은 acceptance-critic이
  read-only 정적 검토라 도구 자기보고를 독립 검증할 수 없다고 밝힌 한계다 — 두 검증 모두 이
  세션에서 Playwright/bash로 실제 실행했고(스크린샷·터미널 출력 존재), 별도 조치 불필요.

**최종 상태**: 8/8 SubTask 완료. 미커밋(사용자 확인 후 `/ship` 여부 결정 — CLAUDE.md 규칙).
