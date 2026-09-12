// src/components/compare/StatusFilterChips.tsx
// 상태 필터 칩 5종 — 프로토타입 `.chip` 1:1(docs/design/prototype/02-comparison-table.html
// `.status-chip-row`). 순수 프레젠테이션(상태는 부모 CompareExplorer가 소유) — CompareExplorer의
// 'use client' 경계 안에서만 쓰인다.
//
// 비선택 칩 배경(2026-09-12·5차, R6 사용자 재지적 — "동일 스타일 쓰는 곳 찾아서 알아서 통일"):
// 기존 `bg-surface`(완전 불투명)가 바로 옆 LaneFilter.tsx의 비선택 배지(배경 없음, 테두리만)와
// 같은 필터 줄 안에서 눈에 띄게 달랐다. LaneFilter와 동일하게 배경을 없앤다.
//
// pill 마크업(2026-09-12·6차): 선택 상태 배경을 arbitrary 값
// (`bg-[color-mix(in_oklab,var(--accent),transparent_88%)]`, 토큰 우회)으로 직접 구현하고
// 있었고, padding(`py-1`)·gap(`gap-1`)도 CompareExplorer.tsx의 같은 필터 줄에 나란히 있는
// LaneFilter(`py-1.5`/`gap-1.5`)와 미묘하게 달랐다. 공용 FilterPill(토큰 유틸 `bg-accent/20`
// 사용)로 교체해 두 필터 줄이 완전히 같은 마크업을 공유하게 한다.

import FilterPill from "@/components/FilterPill";
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
          <FilterPill key={filter.key} selected={isActive} onClick={() => onChange(filter.key)}>
            {filter.label}
          </FilterPill>
        );
      })}
    </div>
  );
}
