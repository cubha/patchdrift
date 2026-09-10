// src/components/compare/StatusFilterChips.tsx
// 상태 필터 칩 5종 — 프로토타입 `.chip` 1:1(docs/design/prototype/02-comparison-table.html
// `.status-chip-row`). 순수 프레젠테이션(상태는 부모 CompareExplorer가 소유) — CompareExplorer의
// 'use client' 경계 안에서만 쓰인다.

import { STATUS_FILTERS } from "./logic";

export interface StatusFilterChipsProps {
  active: string;
  onChange: (key: string) => void;
}

export default function StatusFilterChips({ active, onChange }: StatusFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="상태 필터">
      {STATUS_FILTERS.map((filter) => {
        const isActive = filter.key === active;
        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(filter.key)}
            className={`inline-flex items-center gap-1 rounded-pill border px-3 py-1 text-xs font-bold ${
              isActive
                ? "border-accent bg-[color-mix(in_oklab,var(--accent),transparent_88%)] text-accent"
                : "border-border bg-surface text-fg-2"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
