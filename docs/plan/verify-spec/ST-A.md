### VERIFY-SPEC — SubTask ST-A (V4 협곡 나이트 팔레트 교체)
- 기준선 요구사항: PLAN-ux-redesign-2026-09-10.md §4 ST-A — "docs/design/DESIGN-TOKENS.md에 먼저 추가한 뒤 src/styles/tokens.css에서 참조. 비-색 토큰(spacing 등)은 seed verbatim 유지. [data-game] 오버라이드 계약만 문서화, PUBG 램프 미출하(사용자 승인)."
- 변경 파일: docs/design/DESIGN-TOKENS.md(수정), src/styles/tokens.css(수정), docs/design/prototype/{01,02,03,04}-*.html(:root 블록만 sed 치환), CLAUDE.md(네임스페이스 열거 갱신)
- 관찰 가능한 계약: `--bg #030d18 --surface #0a1626 --accent #c8a355 --success #0ac8b9 --danger #cf4740` 등 §2 확정표 그대로. `--focus-ring`도 새 accent 기준 rgba로 파생 갱신(놓치기 쉬운 4건 중 하나로 planner가 지적).
- 구현 결정: seed(catalog-tokens.css) 파일 자체는 미변경(벤더 프로베넌스 보존) — 색만 patchgap 소유로 tokens.css 헤더 주석에 경계 명시. `[data-game]` 실제 CSS 규칙(PUBG 램프)은 출하하지 않고 계약 설명 주석만 tokens.css에 추가.
- 인접 경계: 전 화면(홈/대조표/항목상세/방법론) 렌더가 이 색 참조에 의존 — `var(--*)` 참조라 컴포넌트 코드 변경 없이 자동 반영. design-lint가 즉시 검증(D-COLOR-02).
- 미확인 사항: 뱃지 색상각 트레이드오프(accent 40°·warn 38°)의 보조 구분(형태) 미적용 — HANDOFF §2가 "실제 화면 보고 판단"을 요구해 이번엔 보류. 대조표에서 두 뱃지 동시 노출 시 재검토 필요.
