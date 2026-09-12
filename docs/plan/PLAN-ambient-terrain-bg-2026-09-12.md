# PLAN — 전역 앰비언트 배경(협곡 아이소메트릭 섬) — 2026-09-12

## 기준 시안
- 아티팩트 "협곡 앰비언트 배경" v5 (rift-bg-v5.html, 4개 탭: 앵커 3종/라인 카메라/인트로
  리빌/상세+스플래시) — 사용자 확정: "아이소메트릭 섬 + 상단 앵커 앰비언트 블리드, 라인
  카메라, 인트로 리빌, 상세 스플래시".
- 채택 범위: LAYER 1(전역 배경·상단 앵커, 이미지=아이소메트릭 섬 확정) · LAYER 2(라인
  카메라, 홈 한정) · LAYER 3(인트로 리빌, 최초 진입 1회) · LAYER 4(상세 스플래시, 항목상세
  챔피언 항목 한정). "협곡 계곡"/"칼바람나락" 이미지 옵션, "우측 하단"/"좌측 하단" 앵커
  옵션(홈 기준)은 시안의 비교 UI일 뿐 — 채택하지 않음.

## 아키텍처 결정 (advisor 검토 반영)
- 배경은 `layout.tsx`에 **단일 인스턴스**로 렌더(`AmbientBackground.tsx`) — 페이지마다 따로
  렌더하지 않는다. 선택 라인·상세 스플래시 URL은 `AmbientContext.tsx`(client context, 역시
  layout.tsx 소유)가 갖고, `ReleaseNoteStream`(홈)과 `AmbientDetailSplash`(항목상세)는
  소비자/갱신자일 뿐 배경 자체를 그리지 않는다.
- 기존 `heroSplash.ts`/`resolveHeroSplashEntityKey`/`HeroAmbient.tsx`/
  `HeroSummary.ambientSplashUrl`(카드 안에 패치 대표 챔피언 스플래시 1장)은 **삭제** —
  "지형=전역·불변, 스플래시=항목상세 전용"이라는 확정 아키텍처와 상충했다.

## 구현
- `src/lib/laneCamera.ts` — `LaneAxis → {tx,ty,scale}` 순수 변환(시안 실측 fx/fy/z 표 승계).
  **TDD**(RED→GREEN, `__tests__/laneCamera.test.ts`) — 유일하게 tdd-gate 3-AND를 만족하는
  대상(순수 함수·결정론·단위 러너 존재).
- `src/components/AmbientContext.tsx` — `selectedLane`/`detailSplashUrl` 공유 상태.
- `src/components/AmbientBackground.tsx` — sitewide 고정 레이어. `usePathname()`으로
  홈(`/`)·항목상세(`/item/*`)·기타를 분기. 인트로 리빌은 `localStorage`를 **effect에서만**
  읽어(lazy initializer 금지 — SSR/최초 클라이언트 렌더는 항상 정지 상태로 시작해 hydration
  mismatch를 피한다) 홈 최초 진입 1회만 재생.
- `src/styles/ambient.css` — 시안의 `.stage`(aspect-ratio 고정 박스) 좌표계를
  `position:fixed;inset:0`(임의 뷰포트) 좌표계로 재산출. 세로 마스크 반경을 뷰포트 비율이
  아닌 절대 px로 고정해, 세로로 긴 뷰포트에서도 섬이 하단까지 늘어나지 않고 상단 배너
  영역에만 머물게 했다.
- `scripts/run-ddragon.ts` — 항목상세 스플래시 자산을 등장 챔피언 전원(173종)분 다운로드하는
  단계 추가(`public/dd/splash/{championId}_0.jpg`, DDragon splash CDN은 버전 비종속 경로).
- `src/components/item/detailSplash.ts` / `AmbientDetailSplash.tsx` — 항목상세 페이지가
  entityType==="champion"일 때만 그 챔피언 스플래시 URL을 컨텍스트에 알린다.
- 자산: `public/bg/{island.webp,island-wash.jpg,baron.png,drake.png,intro.webm,intro-still.jpg}`
  — 아티팩트에 base64로 굳어 있던 자산을 추출해 WebP 재인코딩(211KB PNG → 58KB WebP,
  알파 채널은 전 영역 불투명이라 손실 없음 — 사각 경계 제거는 CSS mask가 담당, PNG 알파가
  아니다) + 배치.

## 발견 즉시 수정한 결함 (구현 중 실측)
- `src/app/{page,compare/page,item/[id]/page,methodology/page}.tsx`의 루트 wrapper가
  전부 `className="flex flex-1 flex-col bg-bg"`로 **불투명** 배경을 깔고 있었다 — layout.tsx의
  고정 배경(z-index:0)이 이 z-index:1 오버레이에 완전히 가려져 화면에 전혀 보이지 않았다
  (Playwright 실측으로 발견: 스크린샷 픽셀이 `--bg` 단색 그대로). `bg-bg` 클래스 제거로 해결
  — 각 페이지 루트는 이제 투명 wrapper이고 배경은 전적으로 layout.tsx 배경이 담당한다.

## 미확인·의도적 축소
- 아이소메트릭 섬 좌표(마스크 반경·앵커 오프셋)는 1440×900/480×900 2개 뷰포트에서만
  Playwright로 실측 조정했다. 초광폭(21:9)·태블릿 중간폭은 미검증.
- 대조표(`/compare`)의 자체 라인 필터는 이 배경 카메라와 연동하지 않는다(확정 시안이 데모한
  화면은 "브리핑"뿐 — 범위 확대 아님, 필요시 후속 작업).
- 인트로 리빌 "다시 재생" 버튼(시안 데모 전용 UI)은 구현하지 않음 — 실사용 요구사항 아님.

## 2차 요구 — "컨텐츠에 전부 가려진다" (2026-09-12, 사용자 실측)
- 요구 원문: "시안과 동일하게 탑nav 를 반투명화 처리 → 지금 배포서버에 적용하니까 우리가 반영한
  디자인들이 컨텐츠에 전부 가려져서 너무슬프다. 컨텐츠섹션 판넬을 반투명화 처리를하던,
  레이아웃영역을 조절하던 우리가만든 디자인들이 잘보일수잇도록 개선진행해봐".
- 채택: **크롬 3줄(헤더·패치쌍 필터바·대조표 필터바) 반투명화 + 히어로 헤드라인을 카드 밖으로**.
  지형이 존재하는 구간이 상단 560px뿐이고 그 대부분을 이 넷이 덮고 있었다는 실측이 근거다.
- 기각: **전역 Container 폭 축소**(레이아웃 조절 안). 이득이 사용자 화면 폭에 전적으로 의존한다 —
  1440에서는 여백이 60px라 아무것도 안 보이고 2560에서는 이미 보인다. 확인할 수 없는 사실에 거는
  도박이라, 폭에 무관한 반투명 경로를 택했다. 대조표·방법론·항목상세까지 같이 좁아지는 부작용도 있다.
- 기각: **데이터 패널(카드·표) 반투명화**. 사용자가 허용한 선택지지만, y 560 아래엔 지형이 없어
  얻는 것은 흐릿한 색면뿐이고 잃는 것은 조밀한 수치 텍스트의 대비다. 시안 v5의 자기 주석
  ("콘텐츠는 불투명 유지")과도 같은 결론. 필요하면 같은 토큰 패턴으로 추가 가능(구조 변경 불필요).
- 상세 결정·실측 수치는 `docs/plan/verify-spec/ST-ambient-terrain-bg.md` §2차 참고.

## 3차 후속 — 마커 제거 (2026-09-12 /verify-impl 실측)
**LAYER 2의 마커(바론/드래곤 둥지)를 제거했다.** 카메라 이동 자체는 유지된다.

- **왜**: 시안 v5에서 마커가 보였던 것은 그 데모의 리스트가 라인 필터로 짧아지며 아래 지형이
  드러나는 레이아웃이었기 때문이다. 구현의 좌측 스트림은 2026-09-11 사용자 지시로 우측 컬럼
  높이에 맞춘 **고정 높이 + 내부 스크롤**(`StreamColumnLayout`)이라 필터를 걸어도 리스트가
  짧아지지 않는다 → 마커가 들어설 빈 지형이 구조적으로 생기지 않는다.
- **실측 근거**: 마커가 켜지는 세 라인(탑·원딜·서포터) **전부**에서 마커 중심점의
  `document.elementFromPoint`가 스트림 카드(`SUMMARY`/`DETAILS`)였다 — `opacity:.95`로 켜져
  있으나 화면에는 한 번도 보이지 않았다. 조건부 렌더를 넣어도 항상 false인 죽은 코드가 된다.
- **기각한 대안 2개**: ①마커 좌표 이동 → "바론 둥지"가 바론 둥지 아닌 곳을 가리키게 된다(좌표가
  지도 랜드마크에 의미적으로 고정돼 있다). ②마커 z를 콘텐츠 위로 → "배경은 콘텐츠 뒤"라는 이
  레이어의 전제가 깨지고 데이터 표 위에 장식 아이콘이 뜬다.
- **어포던스는 마커 없이도 전달된다(실측)**: 라인 전환 시 상단 배너 밴드의 픽셀이 눈에 띄게
  변한다 — 전체↔탑 22.8% · 전체↔원딜 27.2% · 탑↔원딜 28.2%(임계 RGB합 24 초과 기준).
- 자산 `public/bg/{baron,drake}.png`(합계 96KB)는 되살릴 때를 위해 남겨뒀다.
