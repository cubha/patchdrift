# PLAN — 배포 화면 결함 6건 수정 (2026-09-12, 4~5차)

생성: 2026-09-12 · 소스: 사용자 실사용 피드백(배포된 patchgap.vercel.app, ea15bd2 기준) + planner 산출(advisor 검토 반영)
갱신: 2026-09-12(5차) — R6 아티팩트(bg-visibility-proposal.html "옵션 B") 사용자 승인 + 배치 조정 지시 반영, 구현 완료. 아래 X1을 대체하지 않고 하단에 R6 절을 추가한다(X1은 역사적 기록으로 유지, acceptance-critic이 과거 판정 근거를 추적할 수 있도록).

## 요구사항 (사용자 원문 그대로 — R1~R5. R6는 별도 아티팩트로 방향 제시 후 5차에서 구현)

- R1. bg 이미지의 좌/우가 잘려있음. 전체화면에 적용될 수 있도록 연속되는 이미지를 생성해서 bg에 적용
- R2. 좌측 패치내용 요약영역과 우측 매치평균 영역의 상단영역이 뱃지 기준으로 맞춰져있음. List 상단을 기준으로 우측 섹션 영역을 아래로 이동
- R3. 상단 크롬 바 영역을 로고 기준으로 텍스트 및 뱃지, dropdown이 가운데 align되도록 수정. → 각 항목의 gap이 너무 좁아서 영역이 혼잡해보임. 간격조정
- R4. 스크롤이 발생하는 영역의 스크롤이 전부 기본 window 스크롤임. 테마에 맞는 커스텀 스크롤로 변경
- R5. 대조표 메뉴의 델타테이블 영역의 데이터 모든항목이 expand로 보여지고있어 화면에 너무 긴 스크롤발생. 메인메뉴의 요약영역참조해서 패치노트항목 섹션과 동일한 영역으로 height 지정하고 내부 스크롤 발생하도록 변경

## 제외 합의

- X1. R6("전체 메뉴가 아직도 반영이 안되고 각 섹션이 BG를 덮고있음")는 사용자가 "이부분은 시안먼저 작성"이라고 명시했다 — 이 PLAN/파이프라인에 구현 SubTask로 넣지 않는다. 진단+아티팩트는 별도 산출(https://claude.ai/code/artifact/89231f95-49e4-4f56-a67d-48ed0e986718)로 사용자 승인 대기 중.
- X2. R1은 "새 시임리스 이미지 생성"이 아니라 CSS 폭 공식 버그로 재정의됐다(아래 ST-UX1 근거) — 이 환경에 이미지 생성 도구가 없어 원문 그대로의 처방은 애초에 불가능. 대체 처방으로 동일 결과(끊김 없는 배경)를 달성한다.

## SubTask 목록 (전량 [S] — 근거는 실행 순서 절 참고)

| ID | 설명 | 파일 | TDD |
|---|---|---|---|
| ST-UX1 | 앰비언트 배경 래스터 좌우 잘림 제거 — `.ambient-cam-inner`/`.ambient-reveal` 폭 공식 교체 | src/styles/ambient.css | 비적격(절대제외: UI 렌더링) |
| ST-UX2 | 홈 2컬럼 상단 정렬 — 라인필터를 그리드 row1로 분리(CSS Grid 행 배치, JS 오프셋 없음) | src/components/home/StreamColumnLayout.tsx, ReleaseNoteStream.tsx, StreamLaneFilter.tsx(신규), app/page.tsx, home/__tests__/render.test.tsx(갱신) | 비적격(채택 설계에 순수 로직 없음 — 아래 근거) |
| ST-UX3 | 대조표 델타테이블 내부 스크롤(640px, 프로토타입 `.note-item-list` 규약) + sticky 헤더 | src/components/compare/DeltaTable.tsx | 비적격(절대제외: UI 렌더링) |
| ST-UX4 | 테마 커스텀 스크롤바(전역, 순수 CSS) | docs/design/DESIGN-TOKENS.md → src/styles/tokens.css, src/styles/scrollbar.css(신규), src/app/globals.css | 비적격(절대제외: UI 렌더링) |
| ST-UX5 | 상단 크롬 바 정렬(광학 중앙) · 간격(그룹간 24px/그룹내 20px) 재조정 | src/components/Header.tsx | 비적격(절대제외: UI 렌더링) |

## 실행 순서 (전량 [S] 순차)

**ST-UX1 → ST-UX2 → ST-UX3 → ST-UX4 → ST-UX5**

1. ST-UX1 먼저 — 유일하게 되돌리기 비용이 있는 시각 변경(섬 확대율 변화, 사용자 사인오프 필요).
2. ST-UX2 → ST-UX3 — 스크롤 컨테이너 최종 형태 확정.
3. ST-UX4 — 완성된 스크롤 컨테이너 위에서 스타일링(재작업 없이 1회).
4. ST-UX5 마지막 — 헤더 높이(57px) 보존 설계라 순서 무관하나, `.ambient-scrim` 재실측을 ST-UX1 이후 1회로 묶기 위해 마지막에 둔다.

[P] 후보는 파일 교집합 0이라 기술적으로 가능하나 **[S] 채택** — 근거: (a) 5건 전부 최종 판정이 동일 dev 서버·동일 브레이크포인트 스크린샷이라 병렬 시 회귀 귀속 불가, (b) ST-UX5(헤더 높이)가 ST-UX1(.ambient-scrim 정지점)과 ambient.css를 통해 간접 결합, (c) ST-UX4는 ST-UX2·ST-UX3의 산출물 위에서만 실측 가능(선행 의존).

## ST-UX1 — 사용자 확인 필요 사항 (착수 전)

**진단**: `.ambient-camera`가 `overflow:hidden`이라 결함 임계는 정확히 **뷰포트 폭 > 1320px**(마스크 62%가 아니라 래스터 폭 상한 `min(1320px,128vw)`이 지배). 1440px에서 마스크 알파 ≈0.34, 1920px ≈0.59, 2560px ≈0.78 지점에서 래스터 사각 경계가 노출된다.

**처방 3안**(택1, 기본값은 1순위):

| 순위 | 처방 | 1440 확대율 | 1920 확대율 | 2560 확대율 | 비고 |
|---|---|---|---|---|---|
| 1(기본) | `width: min(max(110vw, 1320px), 128vw)` | 1.13× | 1.51× | 2.02× | ≤1269px 완전 동일(회귀 없음) |
| 2 | `width: 128vw`(상한 제거) | 1.40× | 1.86× | — | 3840px+에서 상단 이음선 노출 우려 |
| 3 | 마스크 반경 클램프(래스터 확대 없음) | 1.0× | 1.0× | 1.0× | 선명 밴드가 화면 대비 좁아짐 — "전체화면 적용" 요구와 반대 방향 |

## 참고
- Ground Truth: docs/design/DESIGN-TOKENS.md, docs/design/UX-BRIEF.md, docs/design/prototype/{01-briefing-home,02-comparison-table}.html
- `/frontend-design` 호출 불필요 — 5건 전부 기존 화면 내부 배치/간격/스크롤 수정, 신규 화면·컴포넌트 유형 없음.
- 상세 원인·트레이드오프·함정(sticky+border-collapse, Chrome 121 scrollbar-color 우선순위, laneCamera.ts tx/ty 불변식 등)은 세션 기록 참고 — 구현 시 VERIFY-SPEC에 재기술한다.

---

## R6 — 구간 한정 유리화 + 배치 조정 (2026-09-12, 5차)

**요구사항 원문(사용자, 2차 확인 메시지)**: "아티팩트도 권장 옵션B로 하는게 좋은거같아. 근데 내가얘기한건 배치를 좀 수정하자 이거야. 모든 섹션판넬이 화면 상단에 너무가까워서 BG를 가리니까." — 즉 (a) bg-visibility-proposal.html "옵션 B(구간 한정 유리화)" 승인 + (b) 패널이 화면 상단에 너무 붙어 있다는 배치 지적, 둘 다 반영 대상.

**진단(실측, 1440×900)**: 카메라 노출 밴드(y<873px, `.ambient-scrim`이 `--bg`로 완전히 닫히는 지점) 안에서 5차 변경 전 패널 점유:
- 히어로 스탯 패널 top=203 (밴드 내 114px 불투명)
- 릴리즈노트 스트림 + 매치평균 행 top=385 (밴드 내 각 488px/278px 불투명)
- 라인별 괴리 패널 top=687 (밴드 내 186px 불투명)

`laneCamera.ts`의 초점(fy 0.255~0.575)이 투영되는 지형 영역이 y 385~873 대역과 거의 겹쳐, 라인 전환 시 카메라 pan/zoom은 코드상 정상 작동(실측 확인)하지만 그 대상 지형이 패널에 거의 다 가려 체감상 "사라진 것처럼" 보였다 — R6의 배치 지적과 동일 원인.

**적용 처방**:
1. **배치 조정** — `src/app/page.tsx` Container `py-8`→`pt-14`(하단 유지), `src/components/home/HeroSummary.tsx` 헤드라인↔스탯 패널 `gap-5`→`gap-8`. 실측: 히어로 스탯 패널 top 203→239px, 릴리즈노트/매치평균 행 top 385→422px.
2. **옵션 B(구간 한정 유리화)** — 밴드 안의 최초 1~2개 패널(히어로 스탯, 매치평균)에만 헤더와 동일 레시피 적용. 신규 토큰 `--panel-glass-fill: color-mix(in srgb, var(--surface) 46%, transparent)`(tokens.css/DESIGN-TOKENS.md), 신규 클래스 `.panel-surface-glass`(src/styles/panel.css, 배경/보더만 override — `border-top: 2px solid var(--accent)`로 골드 강조 유지), `SectionCard`에 `variant?: "opaque"|"glass"` prop 추가(Container `width` prop과 같은 선례). 릴리즈노트 스트림·라인별 괴리 패널은 아티팩트가 명시한 "최초 1~2개" 범위 밖이라 불투명 유지.
3. **대비 재검증(실측, 필수 — 유리화는 배경 알파 혼합이라 DESIGN-TOKENS.md의 불투명 채움 불변식이 적용 안 됨)**: 유리화 직후 히어로 스탯 라벨(`--muted`)을 Playwright 픽셀 샘플로 측정하니 "전체" 라인 4.01:1, "서포터" 라인 4.23:1로 AA 4.5:1 미달. 해당 3개 라벨(`공지된 변화`/`유의 변화`/`미공지`)을 `--fg-2`로 올려 재측정 — 두 라인 모두 7.3~7.8:1로 통과(2차의 히어로 보조문단 처방과 동일 패턴). 매치평균 패널 라벨은 원래 `--fg-2`라 별도 조치 불필요.

**검증**: `verify.sh --full` 통과(Spec/TS/ESLint/vitest/build/design-lint 전부 통과, 기존부터 있던 arbitrary-value 경고 2건은 이 변경과 무관·불변).

**범위 밖(이 시점 기준)**: `/compare/`·`/item/[id]/` 페이지는 R6 스크린샷·진단이 모두 홈 기준이라 이번 배치 조정 대상에서 제외. 두 라우트에서도 동일 증상이 재현되면 별도 확인 후 처방한다. → **R6.1에서 `/compare/`는 반영, `/item/[id]/`는 계속 보류(아래 참고).**

---

## R6.1 — 전면 유리화로 확대 + 필터 배지·대조표 통일 (2026-09-12, 5차 연속)

**요구사항 원문(사용자, 연속 3메시지)**:
1. "지금 좌측 요약섹션이 여전히 단색 판넬이고 투명도도 그대로라고... 저거만수정하지말고 저거랑 똑같이되어있는데를 전부수정해. 지금 매치평균 섹션과 화면상단 판넬이 내가원하는 bg color랑 투명도야."
2. "왜 좌측 요약영역 (필터 뱃지잇는곳)은 왜 혼자만 다른 bg컬러에 투명도 0이냐고"
3. "여기만이런게아니라 동일스타일사용하고잇는데좀 찾아서 알아서좀 통일시켜주면안되니?"

**방향 전환**: R6 원안(옵션 B, 카메라 밴드 안 1~2개 패널만 유리화)을 폐기하고 **홈의 모든 `.panel-surface`를 유리화**하는 것으로 바뀌었다 — 실제 배치 화면에서 인접 패널 간 이질감이 진단(아티팩트, 카드 단독 비교)보다 훨씬 크게 느껴진다는 사용자 판단.

**적용 처방**:
1. **전면 유리화** — `ReleaseNoteStream.tsx`(릴리즈노트 스트림 + 빈 상태), `LaneGapPanel.tsx`(미공지 분포, `variant="glass"`), `DiscordPanel.tsx`(`variant="glass"`)에 `panel-surface-glass` 추가. 카메라 밴드 밖(y>873px, 예: DiscordPanel top≈1081)도 예외 없이 포함 — "카메라 노출 여부와 무관한 전면 통일"이 사용자 의도.
2. **레일 통일** — `panel-surface-glass`의 상단 강조가 단색 `border-top: 2px solid var(--accent)`(아티팩트 목업 그대로)였던 걸, 불투명 패널과 동일한 골드 그라디언트 레일(`background-image` 2px 페이드)로 교체. 채움(fill)만 기능상 불가피하게 다르게 남긴다.
3. **`--muted` 대비 중앙화** — 전면 유리화로 텍스트 밀도 높은 릴리즈노트 리스트까지 유리화되며 `--muted`가 리스트 하단(더 어두운 구간)에서도 4.43:1로 AA 근접 미달 실측. 컴포넌트별 개별 치환(HeroSummary에서 먼저 했던 방식) 대신 `src/styles/panel.css`에 `.panel-surface-glass .text-muted { color: var(--fg-2) }` 한 줄로 중앙화 — 이후 유리화되는 모든 패널에 자동 적용(HeroSummary의 개별 치환은 되돌림). 재측정 7.3~9.7:1.
4. **필터 배지 통일** — `LaneFilter.tsx` 선택 상태가 유일하게 완전 불투명 `bg-accent` solid 블록으로 남아 있던 것을 지적받아, Header.tsx 활성 탭과 같은 언어(`border-accent` + 반투명 워시)로 교체: `bg-accent/20 text-accent`. 대비 재측정 5.14:1.
5. **`/compare/` 확대(사용자의 "동일 스타일 찾아서 통일" 지시로 선제 발견)** — `LaneFilter`는 홈과 `/compare/`가 공유 컴포넌트라 4번 수정이 자동 반영됨을 확인. 추가로 발견·수정: `StatusFilterChips.tsx`(비선택 칩이 `bg-surface` 불투명 — LaneFilter와 같은 필터 줄에서 이질감, 배경 제거로 통일), `NoteNavigator.tsx`·`CompareExplorer.tsx`의 델타테이블 래퍼(top≈143px부터 카메라 밴드 전체를 불투명으로 덮음 — 홈과 동일 처방으로 `panel-surface-glass` 추가). 재측정 최저 6.43:1.
6. **의도적 보류**: `/item/[id]/`(항목 상세)도 `panel-surface`(SourceMatchesPanel·CausesPanel)를 쓰지만 배경 메커니즘이 다르다(`.ambient-duo` — 우측 62% 폭, 전체 높이 스플래시. 홈/대조표의 y<873px 카메라 밴드와 다른 기하) — 검증 없이 유리화하면 뒤에 비칠 게 없어 그냥 칙칙해질 위험이 있어 이번 라운드에서 제외. 동일 요청 시 별도 실측 후 처방.

**검증**: `verify.sh --full` 통과(Spec/TS/ESLint/vitest/build/design-lint). 이 라운드 중 공유 머신 메모리 부족(스왑 소진)으로 `--full`이 3회 타임아웃됐으나 코드 원인 아님 — `--ts-only`로 각 단계 확인 후 최종 `--full` 통과로 마무리.
