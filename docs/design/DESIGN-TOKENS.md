# Design Tokens — patchgap

> 생성일: 2026-09-05 · **팔레트 V4 개정: 2026-09-10** (`docs/design/HANDOFF-redesign-2026-09-10.md` §2)
> 출처: docs/design/prototype/*.html (4장) ← docs/design/seed/catalog-tokens.css
> Ground Truth: `docs/design/seed/catalog-tokens.css` (design-lint `--token-source`로 이 파일을 전달한다)
> Provenance: open-design (nexu-io/open-design) / package `trading-terminal` / Apache-2.0 / https://github.com/nexu-io/open-design/blob/main/design-systems/trading-terminal/tokens.css
> 채택 규율: 토큰 이름은 카탈로그 verbatim. 프로토타입 4장 모두 `:root` 블록을 그대로 복사해 `var(--…)`로만 참조. 아래 "사용" 열 ✓=프로토타입에서 참조됨, ○=향후 사용 예정(dead token warn 대상, 삭제하지 않음)
>
> **경계 (2026-09-10 확정)**: 아래 `:root` 블록 중 **색 램프(Color 절)만 patchgap 소유**다 — LoL 브랜드 실측(HANDOFF §2, leagueoflegends.com/ko-kr DOM 계측, 재조사 금지)에 근거해 값이 카탈로그 원본과 다르다. **비-색 토큰(타이포·spacing·radius·elev·motion·container)은 `docs/design/seed/catalog-tokens.css` verbatim을 그대로 유지**한다 — seed 파일 자체는 건드리지 않는다(벤더 프로베넌스 보존). 색 값을 다시 바꾸려면 이 파일을 직접 갱신한다(seed 갱신 불필요 — 색은 seed 소유가 아니므로).

<!-- design-lint:tokens -->
```css
:root {
  --bg: #030d18;
  --surface: #0a1626;
  --surface-warm: #12213a;
  --fg: #f0e6d2;
  --fg-2: #c3b79f;
  --muted: #8b8677;
  --meta: #c8a355;
  --border: #8c6b33;
  --border-soft: #242c3a;
  --accent: #c8a355;
  --accent-on: #030d18;
  --accent-hover: color-mix(in oklab, var(--accent), black 8%);
  --accent-active: color-mix(in oklab, var(--accent), black 14%);
  --success: #0ac8b9;
  --warn: #f59e0b;
  --danger: #cf4740;
  --game-wash: #0a1626;
  --game-glow: #c8a355;
  --glass-chrome: color-mix(in srgb, var(--bg) 35%, transparent);
  --glass-chrome-2: color-mix(in srgb, var(--surface-warm) 55%, transparent);
  --glass-border: color-mix(in srgb, var(--border-soft) 70%, transparent);
  /* 패널 트리트먼트(2026-09-12, 3차) — 골드 4변 프레임(--border 전체 테두리 + elev-ring)을
     상단 골드 레일 + 깊이 그라디언트 채움으로 교체. 방향 제안 아티팩트(패널·크롬 리디자인
     방향) Q2 "A+B 결합" 권장안. 색 램프 소비이므로 patchgap 소유 — 이 블록에서 값을 바꾼다.
     불변식 ①: L(--panel-fill-from) ≤ 0.0141 → --muted(#8b8677) 위 대비 ≥ 4.5:1(AA 본문).
     --surface-warm 원값(L=0.01523)은 그대로 쓰면 4.42:1로 AA 미달이라 surface 쪽으로 낮췄다.
     불변식 ②: L(--panel-fill-to) > L(--bg)=0.0037 — 바닥이 페이지 배경보다 어두우면 "떠 있는
     카드"가 "파인 홈"으로 뒤집힌다. 혼합은 반드시 in srgb — 위 휘도 계산이 srgb 감마 공간
     보간을 전제한다. 레일은 --accent가 아니라 --border 단독(아래 표 96행 참고) — --accent는
     97행이 상태·링크·버튼 전용으로 못 박았고, 릴리즈노트 미공지 그룹이 이미 accent 좌측 레일을
     의미 신호로 쓰므로 패널 상단에 또 얹으면 혼동이 된다. 그라디언트는 색이 아니라 알파로 뺀다. */
  --panel-fill-from: color-mix(in srgb, var(--surface-warm) 70%, var(--surface));
  --panel-fill-via: var(--surface);
  --panel-fill-to: color-mix(in srgb, var(--surface) 72%, var(--bg));
  --panel-rail-from: var(--border);
  --panel-rail-via: color-mix(in srgb, var(--border) 55%, transparent);
  --panel-rail-to: transparent;
  --font-display: Inter, system-ui, sans-serif;
  --font-body: Inter, system-ui, sans-serif;
  --font-mono: "Roboto Mono", "SF Mono", ui-monospace, Menlo, monospace;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 28px;
  --text-3xl: 40px;
  --text-4xl: 56px;
  --leading-body: 1.45;
  --leading-tight: 1.08;
  --tracking-display: -0.01em;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --section-y-desktop: 80px;
  --section-y-tablet: 60px;
  --section-y-phone: 42px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;
  --elev-flat: none;
  --elev-ring: 0 0 0 1px var(--border);
  --elev-raised: 0 24px 80px rgba(0, 0, 0, 0.42);
  --focus-ring: 0 0 0 4px rgba(200, 163, 85, 0.28);
  --motion-fast: 90ms;
  --motion-base: 160ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --container-max: 1320px;
  --container-gutter-desktop: 36px;
  --container-gutter-tablet: 24px;
  --container-gutter-phone: 16px;
  /* --container-narrow(2026-09-12, 3차)는 seed 경계를 넘는 신규 비-색 토큰이다 — 값 변경이
     아니라 항목상세 전용 추가 폭이라 seed 파일(catalog-tokens.css)은 건드리지 않는다(벤더
     프로베넌스 보존). Q3 "안 L1": 전역 Container(--container-max)는 그대로 두고 항목상세
     페이지에서만 이 값으로 좁힌다 — 시안 스플래시가 우측 컬럼(패널)에 가려지던 문제 대응. */
  --container-narrow: 1040px;
}

/* [data-game] 오버라이드 계약 (2026-09-10 확정, 미출하 — 문서화만) —
   중립 8종(--bg --surface --surface-warm --border --border-soft --fg --fg-2 --muted) +
   워시 2종(--game-wash --game-glow)만 덮어쓴다. 상태 4종(--accent --danger --warn --success)은
   절대 재정의하지 않는다(HANDOFF §1-2 불변식). 같은 특정도(0,1,0)이므로 :root 뒤에 선언해
   소스 순서로 승리시킨다. 이번 릴리스는 이 계약만 정의하고 [data-game="pubg"] 램프는
   출하하지 않는다(HANDOFF §3 경고 — V4 확정 이전 값이라 재도출 전엔 미연결 유지). */
```
<!-- /design-lint:tokens -->

## Color — V4 협곡 나이트 (2026-09-10 확정, HANDOFF §2)
| 토큰 | 값 | 용도(patchgap 문법) | surface 대비 | 사용 |
|---|---|---|---|---|
| `--bg` | #030d18 | 페이지 배경 | — | ✓ |
| `--surface` | #0a1626 | 카드·패널·테이블 표면 | — | ✓ |
| `--surface-warm` | #12213a | 선택 행·호버·필터 바 강조 표면 · 미공지 행 배경 | — | ✓ |
| `--fg` | #f0e6d2 | 본문·헤드라인(근거 있는 문장) | 14.67:1 | ✓ |
| `--fg-2` | #c3b79f | 보조 텍스트·테이블 값 | 9.17:1 | ✓ |
| `--muted` | #8b8677 | 캡션·라벨·**무근거 문장** | 5.00:1 | ✓ |
| `--border` | #8c6b33 | 패널 상단 골드 레일(2026-09-12, 3차 — `--panel-rail-*`) + 표·컨트롤 구분선(골드 — V4 정체성) | 3.69:1 | ✓ |
| `--border-soft` | #242c3a | 행 구분선(약) | — | ✓ |
| `--accent` | #c8a355 | 미공지 상태·링크·주요 버튼·현재 내비 | 7.64:1 | ✓ |
| `--accent-on` | #030d18 | accent 위 텍스트 | — | ✓ |
| `--accent-hover` | derived (oklab, black 8%) | 버튼 호버 | — | ✓ |
| `--accent-active` | derived (oklab, black 14%) | 버튼 활성 | — | ○ |
| `--success` | #0ac8b9 | 상승 델타 ▲ | 미계측(§7 검증 시 추가) | ✓ |
| `--danger` | #cf4740 | 하락 델타 ▼ · 공지-불일치 | 4.00:1 | ✓ |
| `--warn` | #f59e0b | 표본 부족 | — | ✓ |
| `--meta` | #c8a355 | (accent 중복값) 메타 라벨 | — | ○ |
| `--game-wash` | #0a1626 | 히어로 앰비언트 그라디언트 시작색 | — | ✓ (신규) |
| `--game-glow` | #c8a355 | 게임 테마 글로우 강조 | — | ○ (신규, [data-game] 확장용) |
| `--glass-chrome` | derived (srgb, bg 35%) | 상단 크롬(헤더) 반투명 표면 — 확정 시안 `.topbar` `rgba(3,13,24,.35)` | — | ✓ (신규 2026-09-12) |
| `--glass-chrome-2` | derived (srgb, surface-warm 55%) | 필터 바 반투명 표면(시안엔 없는 행 — 헤더와 같은 크롬 대역으로 묶는다) | — | ✓ (신규 2026-09-12) |
| `--glass-border` | derived (srgb, border-soft 70%) | 반투명 크롬의 하단 hairline — 시안 `.topbar` `rgba(36,44,58,.7)` | — | ✓ (신규 2026-09-12) |
| `--panel-fill-from` | derived (srgb, surface-warm 70%→surface) | 패널 깊이 그라디언트 상단(≈#101e34, L=0.0129) | muted 4.61:1(Playwright 실측 — 계산치 4.59:1과 근사 일치, `docs/plan/verify-spec/ST-panel-chrome-redesign-2026-09-12.md` 참고) | ✓ (신규 2026-09-12·3차) |
| `--panel-fill-via` | `var(--surface)` | 패널 깊이 그라디언트 중간(#0a1626) | muted 5.00:1 | ✓ (신규 2026-09-12·3차) |
| `--panel-fill-to` | derived (srgb, surface 72%→bg) | 패널 깊이 그라디언트 바닥(≈#081322, bg보다 밝음) | — | ✓ (신규 2026-09-12·3차) |
| `--panel-rail-from`/`-via`/`-to` | border → border 55% → transparent | 패널 상단 2px 골드 레일(알파 페이드) | — | ✓ (신규 2026-09-12·3차) |

> **기각안** (되살리지 말 것): V1 헥스텍 골드 / V2 마법공학 청록 / V3 협곡 나이트(원안 — `--muted` 3.52:1·`--border` 2.85:1로 WCAG 미달) / 구 `#38bdf8`(하늘색이라 LoL로 안 읽힘). 시안에 비교용으로만 남아 있다.
> **뱃지 색상각 트레이드오프**: `--accent`(40°)와 `--warn`(38°)이 채도만 다르고 색상각이 사실상 같다. 뱃지는 항상 라벨 텍스트를 동반하므로 색은 보조 단서 — 대조표에서 두 뱃지가 동시에 뜨는 실화면을 보고 구분이 부족하면 형태(보더 두께·점 모양)로 보조 구분을 추가한다(선제 적용 금지).

## Typography
| 토큰 | 값 | 사용 |
|---|---|---|
| `--font-display` / `--font-body` | Inter, system-ui, sans-serif | ✓ |
| `--font-mono` | "Roboto Mono", "SF Mono", ui-monospace, Menlo, monospace — 수치·매치 ID·캡션, `tabular-nums` | ✓ |
| `--text-xs` … `--text-3xl` | 11 / 12 / 14 / 16 / 20 / 28 / 40px | ✓ |
| `--text-4xl` | 56px | ○ |
| `--leading-body` / `--leading-tight` | 1.45 / 1.08 | ✓ |
| `--tracking-display` | -0.01em | ✓ |

## Spacing
| 토큰 | 값 | 사용 |
|---|---|---|
| `--space-1` … `--space-8` | 4 / 8 / 12 / 16 / 20 / 24 / 32px | ✓ |
| `--space-12` | 48px | ○ |
| `--section-y-desktop/tablet/phone` | 80 / 60 / 42px | ○ |
| `--container-max` / gutters | 1320px / 36 · 24 · 16px | ✓ (phone ○) |
| `--container-narrow` | 1040px | ✓ (신규 2026-09-12·3차 — 항목상세 전용, seed 비-색 경계 확장) |

## Radius
| 토큰 | 값 | 사용 |
|---|---|---|
| `--radius-sm` / `--radius-md` / `--radius-lg` | 4 / 8 / 12px | ✓ |
| `--radius-pill` | 9999px (뱃지·칩) | ✓ |

## Shadow / Elevation
| 토큰 | 값 | 사용 |
|---|---|---|
| `--elev-ring` | 0 0 0 1px var(--border) | ✓ |
| `--elev-raised` | 0 24px 80px rgba(0,0,0,.42) | ○ |
| `--elev-flat` | none | ○ |
| `--focus-ring` | 0 0 0 4px rgba(200,163,85,.28) | ✓ |

## Motion
| 토큰 | 값 | 사용 |
|---|---|---|
| `--motion-fast` / `--motion-base` | 90 / 160ms | ✓ (base ○) |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | ✓ |
| reduced-motion | `@media (prefers-reduced-motion: reduce)` 가드 필수 | ✓ |

## 상태 색 문법 (구현 불변식)
| 상태 | 뱃지 | 색 |
|---|---|---|
| 공지-일치 | 뉴트럴 보더 | `--border` + `--fg-2` |
| 공지-불일치 | 위험 보더 | `--danger` |
| 미공지 | 강조 | `--accent` |
| 표본 부족 | 경고 | `--warn` |
| 상승 / 하락 | ▲ / ▼ | `--success` / `--danger` |
| 무근거 문장 | — | `--muted` |

> 스택별 주입 구문(Tailwind v4 `@theme`·CSS 변수)은 `/init-project` Phase 4-5-a에서 처리한다. 이 파일은 값만 정의한다.
