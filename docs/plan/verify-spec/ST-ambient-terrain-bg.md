# VERIFY-SPEC — 전역 앰비언트 배경(협곡 아이소메트릭 섬)

## 대상 파일
- `src/lib/laneCamera.ts` + `__tests__/laneCamera.test.ts` (TDD)
- `src/components/AmbientContext.tsx` (신규 — client context)
- `src/components/AmbientBackground.tsx` (신규 — layout.tsx 단일 인스턴스)
- `src/styles/ambient.css` (신규, globals.css에서 import)
- `src/app/layout.tsx` (AmbientProvider + AmbientBackground 배선)
- `src/app/{page,compare/page,item/[id]/page,methodology/page}.tsx` (루트 wrapper `bg-bg` 제거)
- `src/components/home/ReleaseNoteStream.tsx` (selectedLane 소유권을 AmbientContext로 이관)
- `src/components/home/HeroSummary.tsx` / `HeroAmbient.tsx`(삭제) / `heroSplash.ts`(삭제)
- `src/components/item/detailSplash.ts` / `AmbientDetailSplash.tsx` (신규)
- `scripts/run-ddragon.ts` (챔피언 스플래시 다운로드 단계 추가)
- `public/bg/*` (신규 자산 6종), `public/dd/splash/*`(173종, 신규 스크립트 실행 산출물)

## 구현 결정
- 배경 상태(선택 라인·상세 스플래시)는 layout.tsx의 `AmbientProvider` 단일 소유 — 배경을
  두 번 렌더하지 않는다(advisor 검토, PLAN 문서 참고).
- 인트로 리빌은 `localStorage`를 effect에서만 읽는다(lazy initializer 금지) — SSR/최초
  클라이언트 렌더는 항상 정지 상태.
- `.ambient-camera`/`.ambient-reveal`의 세로 마스크 반경은 뷰포트 비율이 아닌 절대 px(560px/
  620px)로 고정 — 뷰포트가 세로로 길어져도 섬이 하단까지 늘어나지 않는다.
- 항목상세 스플래시는 `entityType==="champion"`일 때만 렌더(그 외 entityType은 스플래시 자산
  자체가 없음).

## 검증 결과
- `bash verify.sh --full`: spec/tsc/eslint/vitest/build/design-lint 전부 통과(exit 0).
- Playwright 실측(로컬 dev 서버, localhost:3101):
  - 1440×900 홈: 배경 상단 밴드에 섬 지형 렌더 확인, 사각 경계 없음.
  - 480×900(좁은 세로) 홈: 마스크가 px 고정이라 섬이 늘어지지 않고 상단에만 머무름 확인.
  - 1440×900 항목상세(챔피언, `/item/champion~Nautilus~TOP~winRate/`): 우상단 듀오톤
    스플래시 + 좌하단 지형 코너 동시 렌더, 카드 레이아웃과 겹치지 않음 확인.
  - 라인 필터("탑") 클릭 → `.ambient-cam-inner`의 computed transform이
    `laneCameraTransform("TOP")` 값(scale 1.55)과 일치 확인 — 배경-필터 연동 정상.
  - 인트로 리빌: localStorage 초기화 후 첫 진입 시 `<video>` 렌더+재생(readyState=4), 재진입
    시 미렌더 확인. `patchgap:ambient-intro-seen` 플래그 정상 기록.

## 미확인 사항
- 마스크 반경·앵커 오프셹은 1440×900 / 480×900 두 뷰포트에서만 실측 조정했다. 초광폭(21:9
  이상)·태블릿 중간폭(768~1024)은 미검증 — 사용자가 실사용 중 어색하면 `ambient.css`의 px
  마스크 반경만 조정하면 된다(구조 변경 불필요).
- `prefers-reduced-motion: reduce` 환경에서 인트로 비디오가 `enabled=false`로 꺼지는 로직은
  코드상 확인했으나 Playwright의 `prefers-reduced-motion` 에뮬레이션으로 실측하지는 않았다.
- 대조표(`/compare`)는 이 배경의 소비자가 아니다(자체 라인 필터가 있지만 카메라와 미연동) —
  확정 시안이 데모한 화면이 "브리핑"뿐이라 범위에 넣지 않았다(PLAN X 참고).

---

## 2차 — 콘텐츠가 배경을 가리던 문제 (2026-09-12)

### 문제 (사용자 실측)
배포본에서 "우리가 반영한 디자인들이 컨텐츠에 전부 가려진다". 1차 구현은 배경을 깔았지만
그 위의 크롬·카드가 전부 불투명 `--surface`/`--surface-warm`이었다. 실측 결과 섬 지형이 실제로
존재하는 구간은 `.ambient-camera` 마스크 때문에 **뷰포트 상단 y 0~560px**뿐인데, 그 중
헤더(0~56) + 패치쌍 필터바(56~145) + 히어로 카드(178~420)가 대부분을 덮고 있었다 — 배경이
보이는 자리가 카드 사이 틈 몇 줄뿐이었다.

### 대상 파일
- `docs/design/DESIGN-TOKENS.md` → `src/styles/tokens.css` (`--glass-chrome` / `--glass-chrome-2` /
  `--glass-border` 신규. 색 램프는 patchgap 소유이므로 DESIGN-TOKENS 먼저 갱신 후 복사)
- `src/styles/ambient.css` (`.glass-chrome`/`.glass-chrome-2`, `.ambient-hero-headline`/`-sub`)
- `src/components/Header.tsx` · `src/components/FilterBar.tsx` ·
  `src/components/compare/CompareExplorer.tsx` (크롬 3줄 → 반투명)
- `src/components/home/HeroSummary.tsx` (헤드라인을 카드 밖으로)
- `src/components/AmbientBackground.tsx` (마커 표시 조건)

### 구현 결정
- **크롬만 반투명, 데이터 패널은 불투명 유지.** 시안 v5의 자기 주석("콘텐츠는 불투명 유지 —
  배경은 카드 바깥 여백에서만")을 그대로 따른다. 카드·표를 반투명으로 만들면 y 560 아래에는
  지형이 아예 없어(마스크 밖) 흐릿한 색면만 얻는 대신 조밀한 수치 텍스트의 대비만 잃는다.
- **blur 반경은 시안의 3px이 아니라 16px.** 시안은 스크롤이 없는 정적 데모라 sticky 헤더 아래로
  본문이 지나가는 상황을 검증하지 못했다 — 3px에서는 지나가는 카드 글자가 헤더 텍스트와 겹쳐
  둘 다 읽혔다(실측 스크린샷). 반경을 키워 "서리 유리"로 만들면 지형은 형태로 남고 본문은
  색 얼룩이 된다.
- **backdrop-filter에 벤더 프리픽스를 직접 쓰지 않는다.** Lightning CSS(Tailwind v4)가 타깃에
  맞춰 붙이는데, 표준+`-webkit-`을 같이 쓰면 표준 쪽을 지워버린다(실측: `-webkit-`만 남아
  Chrome에서 blur가 전혀 걸리지 않았고 computed `backdropFilter`가 `none`이었다).
- **히어로 헤드라인을 카드 밖으로.** 시안 `.hero`는 패널이 아니라 배경 위 텍스트(text-shadow만)고
  보더 패널은 `.tiles`(스탯 3분할)뿐인데, 구현이 둘을 한 카드로 묶어 지형 중심부를 덮고 있었다.
- **마커(바론/드래곤 둥지)는 라인 선택 시에만.** 시안 `placeMarkers`는 `'all'`에서도 둘 다 켰지만
  그건 마커 데모 패널의 조건이고, 시안이 제품 화면으로 그린 브리핑 패널엔 마커가 없었다.
  헤드라인을 배경 위로 빼자 기본 상태에서 바론 라벨이 보조 문단과 같은 자리에서 겹쳤다.

### 검증 결과
- `bash verify.sh --full` 통과(exit 0).
- 대비 실측(1440×900, 히어로 텍스트를 숨긴 배경 스크린샷 픽셀 휘도 계산):
  - 헤드라인(`--fg`, 28px bold = 대형 텍스트): 최악 지점 4.08:1 · 중앙값 10.04:1 → AA 대형(3:1) 통과.
  - 보조 문단: `--fg-2`로는 최악 3.54:1(일반 텍스트 AA 4.5:1 미달, 그 줄 면적의 0.83%)이라
    `--fg`로 올렸다 → 최악 5.67:1 · 중앙값 11.78:1로 전 구간 통과.
- Playwright 실측: 홈 1440×900 / 홈 900×900 / 홈 스크롤 700px(sticky 헤더 가독성) /
  대조표 / 방법론 / 항목상세(챔피언) 6화면.

### 미확인 사항
- 대비 실측은 1440×900의 기본 라인 필터("전체") 상태 1건이다. 라인 카메라가 이동하면(z 1.55~1.66)
  히어로 텍스트 뒤에 오는 지형 픽셀이 바뀐다 — 그 상태들의 최악 대비는 재측정하지 않았다.
- `backdrop-filter`를 지원하지 않는 브라우저에서는 배경색(35%/55%)만 남아 헤더 아래 본문이
  비쳐 보인다. 대상 브라우저 범위를 정해 `@supports not (backdrop-filter: blur(1px))` 폴백을
  둘지는 결정하지 않았다.
- 데이터 패널 반투명화는 위 근거로 **하지 않았다**. 사용자가 명시 허용한 선택지라 원하면
  `--glass-panel` 계열 토큰을 같은 방식으로 추가하면 된다(구조 변경 불필요).

---

## 3차 후속 — /verify-impl 화면 대조 (2026-09-12)

### 시안 대비 일치 확인 (축B)
- **라인 카메라 좌표 정확 일치**: 시안 `rift-bg-v5.html` TOP = `z 1.55 / tx 6.00% / ty 24.50%`,
  구현 `.ambient-cam-inner` 인라인 = `--z:1.55 / --tx:6% / --ty:24.5%`. `laneCamera.ts`의 fx/fy/z
  표가 시안 실측값을 승계했다는 주석의 자기주장이 원본 대조로 확정됐다(직전 acceptance-critic이
  "원본 없어 확인 불가"로 남긴 UNKNOWN 1건 해소).
- LAYER 1 상단 앵커 블리드: 시안과 동일하게 섬이 상단 밴드에 머물고 사각 경계 없음.
- LAYER 4 상세 스플래시: 우측에 듀오톤 스플래시 가시(1차 실측 때 안 보이던 것과 대조).
- design-lint: 시안(prototype 4장) error 0 / 구현(out/index.html·항목상세) error 0 —
  **구현에만 있는 토큰 위생 이탈 0건**.

### 발견 → 보완 (마커)
`.ambient-marker`가 화면에 한 번도 보이지 않는 것을 발견해 제거했다. 사유·실측·기각 대안은
`docs/plan/PLAN-ambient-terrain-bg-2026-09-12.md`의 「3차 후속 — 마커 제거」 절 참고.
제거 후 재확인: `.ambient-marker` DOM 0개, 라인 전환 시 카메라 transform은 그대로
`scale(1.55)`(TOP) 동작.

### 미확인 사항 (이번 대조 이후에도 남는 것)
- 대조는 1280×800 한 조건에서만 했다(스킬 규약 고정값). 초광폭·태블릿·모바일 폭에서 시안 대비
  구조가 어떻게 달라지는지는 이번 축B 범위 밖.
- 인트로 리빌(LAYER 3)은 최초 진입 1회 재생이라 이번 대조에서 재현하지 않았다(localStorage가
  이미 소비된 상태) — 1차 라운드에서 별도 실측한 기록으로 갈음한다.
- 시안 `.duo`의 `right:-4%`/`top:-6%`/`height:104%`는 이번에도 비채택 유지(3차 PLAN 기록과 동일).
