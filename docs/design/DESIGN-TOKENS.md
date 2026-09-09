# Design Tokens — patchgap

> 생성일: 2026-09-05
> 출처: docs/design/prototype/*.html (4장) ← docs/design/seed/catalog-tokens.css
> Ground Truth: `docs/design/seed/catalog-tokens.css` (design-lint `--token-source`로 이 파일을 전달한다)
> Provenance: open-design (nexu-io/open-design) / package `trading-terminal` / Apache-2.0 / https://github.com/nexu-io/open-design/blob/main/design-systems/trading-terminal/tokens.css
> 채택 규율: 토큰 이름은 카탈로그 verbatim. 프로토타입 4장 모두 `:root` 블록을 그대로 복사해 `var(--…)`로만 참조. 아래 "사용" 열 ✓=프로토타입에서 참조됨, ○=향후 사용 예정(dead token warn 대상, 삭제하지 않음)

<!-- design-lint:tokens -->
```css
:root {
  --bg: #070b12;
  --surface: #101826;
  --surface-warm: #162238;
  --fg: #f8fafc;
  --fg-2: #cbd5e1;
  --muted: #8492a6;
  --meta: #38bdf8;
  --border: #263246;
  --border-soft: #1c2638;
  --accent: #38bdf8;
  --accent-on: #03111a;
  --accent-hover: color-mix(in oklab, var(--accent), black 8%);
  --accent-active: color-mix(in oklab, var(--accent), black 14%);
  --success: #22c55e;
  --warn: #f59e0b;
  --danger: #ef4444;
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
  --focus-ring: 0 0 0 4px rgba(56, 189, 248, 0.28);
  --motion-fast: 90ms;
  --motion-base: 160ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --container-max: 1320px;
  --container-gutter-desktop: 36px;
  --container-gutter-tablet: 24px;
  --container-gutter-phone: 16px;
}
```
<!-- /design-lint:tokens -->

## Color
| 토큰 | 값 | 용도(patchgap 문법) | 사용 |
|---|---|---|---|
| `--bg` | #070b12 | 페이지 배경 | ✓ |
| `--surface` | #101826 | 카드·패널·테이블 표면 | ✓ |
| `--surface-warm` | #162238 | 선택 행·호버·필터 바 강조 표면 | ✓ |
| `--fg` | #f8fafc | 본문·헤드라인(근거 있는 문장) | ✓ |
| `--fg-2` | #cbd5e1 | 보조 텍스트·테이블 값 | ✓ |
| `--muted` | #8492a6 | 캡션·라벨·**무근거 문장** | ✓ |
| `--border` | #263246 | 카드·테이블 구분선 | ✓ |
| `--border-soft` | #1c2638 | 행 구분선(약) | ✓ |
| `--accent` | #38bdf8 | 미공지 상태·링크·주요 버튼·현재 내비 | ✓ |
| `--accent-on` | #03111a | accent 위 텍스트 | ✓ |
| `--accent-hover` | derived ≈ #33afe6 (oklab, black 8%) | 버튼 호버 | ✓ |
| `--accent-active` | derived ≈ #2fa3d6 (oklab, black 14%) | 버튼 활성 | ○ |
| `--success` | #22c55e | 상승 델타 ▲ | ✓ |
| `--danger` | #ef4444 | 하락 델타 ▼ · 공지-불일치 | ✓ |
| `--warn` | #f59e0b | 표본 부족 | ✓ |
| `--meta` | #38bdf8 | (accent 중복값) 메타 라벨 | ○ |

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
| `--focus-ring` | 0 0 0 4px rgba(56,189,248,.28) | ✓ |

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
