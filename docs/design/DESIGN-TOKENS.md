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
| `--border` | #8c6b33 | 카드·테이블 구분선(골드 프레임 — V4 정체성) | 3.69:1 | ✓ |
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
