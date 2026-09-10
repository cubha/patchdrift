// src/components/home/LaneFilter.tsx
// 라인 필터 6종(전체/탑/정글/미드/원딜/서포터) — HANDOFF-redesign-2026-09-10.md §4-1
// "라인 필터 6종 — 인라인 SVG 글리프". 순수 프레젠테이션(선택 상태·클릭 핸들러는 상위
// ReleaseNoteStream이 소유하는 "use client" 경계에서 props로 내려받는다).
// 접근성: role="group" + 각 버튼 aria-pressed(HANDOFF UI 설계 명세).

import type { LaneAxis } from "@/lib/lane";
import LaneGlyph from "@/components/LaneGlyph";
import { positionLabel } from "@/lib/format";

export interface LaneFilterProps {
  selected: LaneAxis;
  onSelect: (lane: LaneAxis) => void;
  className?: string;
}

const LANES: readonly LaneAxis[] = ["all", "TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

function laneLabel(lane: LaneAxis): string {
  return lane === "all" ? "전체" : positionLabel(lane);
}

export default function LaneFilter({ selected, onSelect, className = "" }: LaneFilterProps) {
  return (
    <div role="group" aria-label="라인 필터" className={`flex flex-wrap gap-2 ${className}`}>
      {LANES.map((lane) => {
        const isSelected = lane === selected;
        return (
          <button
            key={lane}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(lane)}
            className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              isSelected
                ? "border-accent bg-accent text-accent-on"
                : "border-border-soft text-fg-2 hover:border-border hover:text-fg"
            }`}
          >
            <LaneGlyph lane={lane} size={14} />
            {laneLabel(lane)}
          </button>
        );
      })}
    </div>
  );
}
