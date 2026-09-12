# VERIFY-SPEC — 패널/크롬 리디자인 (ST-PC1~PC8, 2026-09-12·3차)

PLAN: `docs/plan/PLAN-panel-chrome-redesign-2026-09-12.md`
기준 아티팩트: 패널·크롬 리디자인 방향 (https://claude.ai/code/artifact/96d308cc-4b52-4d0f-b8a8-2de311ece020)

## 대상 파일
- `src/styles/ambient.css` — `.ambient-duo`(ST-PC1) · `.ambient-detail-headline/-sub`(ST-PC5) ·
  `.ambient-scrim` 정지점 재보정(ST-PC7)
- `docs/design/DESIGN-TOKENS.md` · `docs/design/UX-BRIEF.md` · `src/styles/tokens.css` ·
  `src/styles/panel.css`(신규) · `src/app/globals.css`(ST-PC2)
- `src/components/SectionCard.tsx` · `src/components/home/HeroSummary.tsx` ·
  `src/components/home/ReleaseNoteStream.tsx` · `src/components/compare/NoteNavigator.tsx` ·
  `src/components/compare/CompareExplorer.tsx`(ST-PC3)
- `src/components/Container.tsx` · `src/app/item/[id]/page.tsx`(ST-PC4·PC5)
- `src/components/Header.tsx` · `src/app/layout.tsx` · `src/app/page.tsx` ·
  `src/app/compare/page.tsx` · `src/components/FilterBar.tsx`(삭제)(ST-PC6)

## 구현 결정 (요약 — 상세 근거는 PLAN 파일)
- **ST-PC1**: `.ambient-duo`에 `background: var(--surface)` 추가(블렌드 바탕 누락이 "스플래시가
  안 보인다"의 실제 원인), `width:62%`, 마스크 중심 `at 68% 44%`로 시안 이식. `right:-4%`/
  `top:-6%`/`height:104%`, 마스크 반경·정지점, `object-position`은 비채택(PLAN 「시안 대조」 표).
- **ST-PC2**: `--panel-fill-from/-via/-to`·`--panel-rail-from/-via/-to`·`--container-narrow` 6개
  토큰을 DESIGN-TOKENS.md → tokens.css 순으로 추가. `panel.css`에 `.panel-surface`(레일=alpha
  그라디언트, 채움=180deg 3정지 그라디언트, 둘 다 `background-image` — `::before` 아님, 이유는
  panel.css 파일 헤더 주석). UX-BRIEF §3의 헤더/필터바/항목상세 헤더 구조 서술 갱신.
- **ST-PC3**: 6곳 전부 `border-border`+`elev-ring` → `panel-surface` 단일 클래스로 교체. 컨트롤·
  아이콘 박스(EntityIcon 등, PLAN "Q2 비대상" 목록)는 손대지 않음.
- **ST-PC4**: `Container`에 `width?: "default"|"narrow"` prop 추가(className 문자열 결합이 아닌
  `style={{maxWidth}}` — 특정도 경쟁 없음). 항목상세 페이지 1곳만 `width="narrow"`(1040px).
- **ST-PC5**: 항목상세 판정 헤더의 `<section bg-surface border-border>` 래퍼 제거, 내용을
  `Container(narrow)` 위 평문 `<div>`로. `.ambient-detail-headline/-sub`(시안 `.detail h3`/`.sub`
  그림자 값) 신규 클래스 적용.
- **ST-PC6**: `FilterBar.tsx` 삭제. `Header.tsx`가 패치 쌍 select(옵션 표시만, `pairHref` 미배선
  — 새 라우트 없음, 기존 FilterBar 계약 그대로 이관)·고정 표본 3종 읽기전용 칩·n/집계 캡션을
  `PAIR_SCOPED_ROUTES=["/","/compare/"]`에서만 렌더. `layout.tsx`가 `getPairChromeData()`로
  계산해 prop 전달(Header는 client라 fs 불가). `page.tsx`/`compare/page.tsx`에서 FilterBar
  렌더·관련 미사용 변수(`pairs`/`summaryFrom`/`summaryTo` — compare만) 제거.
- **ST-PC7 (Playwright 실측, 아래 「검증 결과」 참고)**: 크롬 -87px(144→57px)로 `.ambient-scrim`
  정지점을 420/720/960px → 333/633/873px로 재보정. 재측정 결과 홈 히어로 헤드라인 AA 100%
  통과, 보조문단은 단일 글린트가 텍스트 뒤 여백(문자 미겹침)에 위치해 실질 문제 아님(아래 상세).
  항목상세 신규 헤더는 최초 실측부터 AA 여유 통과(별도 조정 불요). `.ambient-duo` 마스크 중심이
  1040px 콘텐츠의 우측 aside 패널(622~894px)보다 오른쪽(≈1154px)에 있어 가려지지 않음 확인.
- **ST-PC8**: 이 문서 + PLAN 파일이 최종 산출물. `verify.sh --full` 재통과 확인(아래).

## 검증 결과
- `bash verify.sh --full`: Spec(fail 0, warn 2 — 기존 ItemChart/DiscordEmbedPreview arbitrary
  값, 이번 라운드 무관) / tsc / eslint / vitest(610 테스트 전부 통과) / build / design-lint 전부
  통과(exit 0).
- `npx next build`: 1997개 정적 페이지 생성 성공(SSG 포함).
- Playwright 실측:
  - 홈 1440×900: 헤더 57px(구 144px, -87px) 확인. 패널 6곳 상단 골드 레일 + 깊이 그라디언트
    시각 확인(스크린샷 크롭으로 레일 페이드 확인).
  - 홈 480×900 / 대조표 480×900 / 항목상세 480×900: 가로 스크롤 없음(`scrollWidth<=innerWidth`
    확인). 헤더는 480px에서 2줄로 자연 wrap(고정 표본 칩·n/집계 캡션은 `hidden md:flex`/
    `hidden lg:inline`이라 애초에 렌더되지 않아 좁은 화면에서 불필요한 줄바꿈이 생기지 않음).
  - 항목상세 1440×900(챔피언, Nautilus~TOP~winRate): 판정 헤더가 배경 위 텍스트로, 우측 스플래시
    가시 확인(1차 실측 때 안 보이던 것과 대조적). 콘텐츠 폭이 1040px로 좁아진 것 확인.
  - **대비 실측(픽셀 휘도, PIL로 sRGB relative luminance 계산 — 기존 HeroSummary.tsx 방법론과
    동일)**:
    - 홈 헤드라인(`--fg`, 28px bold): 최악 5.58:1 · 중앙값 8.19:1 · AA 미달 0.00%.
    - 홈 보조문단(`--fg`, 14px): 배경-only 스캔은 최악 3.14:1(AA 4.5:1 미달) · 해당 줄 면적의
      0.48%. **후속으로 글리프 픽셀만 골라 재검증 — 교집합 0건, 실질 문제 아님으로 확정.**
      방법: 같은 위치를 텍스트 표시/숨김 두 번 스크린샷하고 픽셀 단위로 차분(diff)해 실제
      잉크가 칠해진 픽셀 집합(글리프, 2412px)과 AA 미달 배경 픽셀 집합(55px)을 각각 구한 뒤
      교집합을 계산 — **0건**(정확한 재현 방법은 아래 「방법론」 참고, 육안 대조가 아니라 픽셀
      집합 연산). 그 55px은 전부 문장이 끝난 뒤 여백(밝은 하이라이트 글린트 하나)에 있고 어떤
      글자와도 겹치지 않는다.
    - 항목상세 판정 헤더(`--fg` 20px bold / `--fg-2` 18px): 최악 8.64:1 / 5.66:1 — 둘 다 여유
      통과, 조정 불필요.
    - `--panel-fill-from` 위 `--muted`: 실측 4.61:1(불변식① ≥4.5:1 충족, DESIGN-TOKENS.md 계산치
      4.59:1과 근사 일치). `--panel-fill-to`가 `--bg`보다 밝음(불변식②) 확인.

## 방법론 (글리프-교집합 재검증, ST-PC7 후속 — acceptance-critic 1라운드 지적 반영)
1차 대비 실측은 "문단 bounding box 전체를 배경-only로 스캔"하는 방식이라, 텍스트가 짧아 박스
우측에 여백이 남는 줄에서는 **글자가 없는 빈 공간의 밝기까지 "실패"로 잡을 수 있다**(실제로
그랬다 — 홈 보조문단). acceptance-critic 1라운드가 이 지점을 "육안 대조는 검증 불가능한 근거"로
지적해, 재현 가능한 방법으로 교체했다: 같은 문단을 (a)텍스트 표시 (b)텍스트 `visibility:hidden`
두 상태로 각각 스크린샷 → 픽셀별 RGB 차이 합이 30을 넘는 픽셀을 "글리프 잉크"로, (b)에서 AA
기준 미달인 픽셀을 "배경 실패"로 각각 집합화 → 두 집합의 교집합을 계산. 홈 보조문단은 교집합
0건(글리프 2412px vs 배경실패 55px, 서로 겹치지 않음)으로 실제 텍스트가 읽히는 자리엔 AA 미달
배경이 없음을 확정했다. 이 검증은 대상 문단마다 재실행 가능한 재현 가능 절차다(육안 대조 아님).

## 방법론 한계 (정직 고지, 위 재검증 이후에도 남는 것)
- 크롬 phone(<768px) 2줄 wrap은 스크린샷으로 확인했지만 다양한 폭(600~767px 구간)에서의 wrap
  전환 지점은 개별 실측하지 않았다.
- `.ambient-duo` 62%가 태블릿 중간폭(768~1024px)에서 aside 패널과 겹치는지는 1440px에서만
  확인했다 — PLAN·이전 라운드와 동일한 기존 한계(초광폭·태블릿 미검증)가 이번에도 이어진다.
- 패치 쌍 select는 여전히 `pairHref` 미배선 — 두 번째 쌍(26.16→26.17)을 선택해도 페이지 이동은
  없다(PLAN에서 의도적으로 범위 밖으로 명시한 사항, 재발 아님).

---

## /verify-impl 후속 보완 (2026-09-12) — 원시안 대비 화면 대조에서 잡은 3건

3차 구현이 `verify.sh`·scope-critic·acceptance-critic을 전부 통과한 뒤, **원시안 2종을 실제로
렌더해 구현 화면과 나란히 놓는 축B 대조**에서 코드 게이트가 구조적으로 볼 수 없는 3건이 나왔다.
셋 다 보완 완료:

1. **Q2 "A+B 결합" 중 B의 구성요소 1개 누락 → 보완**: 방향 제안 아티팩트의 B안은
   `.t-b .pnl-head{background:linear-gradient(90deg,rgba(200,163,85,.07),transparent 60%)}`로
   **패널 헤드에 옅은 골드 워시**를 함께 그렸는데, 구현은 레일과 깊이 채움만 가져오고 이걸
   빠뜨렸다. `panel.css`에 `.panel-head-wash`를 추가하고 헤드를 가진 패널 3곳
   (`SectionCard.tsx`·`compare/NoteNavigator.tsx`·`compare/CompareExplorer.tsx`)에 적용했다.
   하드코딩 rgba가 아니라 `color-mix(in srgb, var(--border) 7%, transparent)`로 토큰화 —
   실측 계산값 `color(srgb 0.549 0.4196 0.2 / 0.07)`. 알파는 배경에만 걸리고 텍스트에 닿지
   않으므로 본문 대비 불변(3차 결정 유지).
2. **크롬의 "패치" 시각 라벨 누락 → 보완**: 사용자 요구 원문이 "Top nav에 **라벨과** dropdown만
   포함되도 괜찮을거같아"였고 N2 목업도 select 앞에 라벨을 그렸는데, 3차 구현은 planner 판단
   ("1줄이라 stacked label 불가")으로 `aria-label`만 두고 시각 라벨을 뺐다. `<label>`로 감싸
   시각 라벨 "패치"를 복원하고, 라벨이 접근성 이름을 제공하므로 중복 `aria-label`은 제거했다.
3. **항목상세 브레드크럼 누락 → 보완**: 원시안 ①(`.detail .crumb` = `champion : Camille :
   banRate`)과 원시안 ②(`대조표 › 챔피언 › 노틸러스`) **양쪽 모두** 브레드크럼을 그렸는데
   구현·PLAN·prototype 03·UX-BRIEF 어디에도 없었다. 원시안 ②의 표기(진입 경로 기준 내비게이션)를
   채택 — `nav[aria-label="위치"]`로 `대조표`(링크) › 엔티티 타입 › 엔티티명. 타입 라벨은
   `format.ts`에 `entityTypeLabel`(라벨 SSOT 관례)을 추가해 가져온다.

### 재확인 (보완 후 실측)
`.ambient-marker` DOM 0개 · 헤드 워시 computed `linear-gradient(90deg, color(srgb .549 .4196 .2 /
.07), rgba(0,0,0,0)…)` · 크롬 라벨 텍스트 "패치" · 브레드크럼 텍스트 "대조표›챔피언›노틸러스" ·
라인 카메라 `matrix(1.55,…)` 유지.

### 의도적 미채택 (원시안과 다르지만 근거 있음 — 다음 검증이 재발견하지 않도록 기록)
- **항목상세 크롬에 패치 select·고정표본 칩 없음**: 원시안 ② 항목상세 목업은 이걸 그렸지만,
  3차 PLAN 「설계 근거」가 `findDeltaForId`가 id를 가진 첫 쌍을 쓰므로 항목상세 chrome이 다른
  쌍의 n·집계를 주장할 수 있다는 이유로 "쌍 비소유 라우트에서 렌더 금지"를 명시 결정했다.
- **엔티티 아이콘 72px·상태 뱃지·디스코드 버튼**: 원시안 목업엔 없고 구현에만 있다 —
  UX-BRIEF §3 「03 항목 상세」 헤더 행이 정의한 제품 명세이고, 원시안은 배경/패널을 보여주기
  위한 축약 mock이다. 미요청추가 아님.
- 패널 채움 중간 정지점 34%→22%: 미세 차이, 그대로 둔다. (마커 크기 차이는 마커 자체가
  제거돼 무의미해졌다 — PLAN-ambient-terrain-bg 「3차 후속 — 마커 제거」 참고.)
