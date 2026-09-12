// src/components/LaneFilter.tsx
// 라인 필터 6종(전체/탑/정글/미드/원딜/서포터) — HANDOFF-redesign-2026-09-10.md §4-1
// "라인 필터 6종 — 인라인 SVG 글리프". 순수 프레젠테이션(선택 상태·클릭 핸들러는 상위
// "use client" 경계 — 홈은 ReleaseNoteStream, 대조표는 CompareExplorer — 가 소유한다).
// 2026-09-10 home/ → components/ 이동: 확정 시안이 대조표에도 같은 필터를 두므로 화면 전용
// 디렉토리에 둘 수 없게 됐다(LaneGlyph와 같은 층).
// 접근성: role="group" + 각 버튼 aria-pressed(HANDOFF UI 설계 명세).
//
// 선택 상태(2026-09-12·5차, R6 재지적): 원래 `bg-accent`(불투명 골드 채움)였는데, 홈의 모든
// 패널을 유리화한 뒤 이 배지만 유일하게 완전 불투명 solid 블록으로 남아 사용자가 "여기만
// 다른 bg 컬러에 투명도 0"이라고 재지적했다. Header.tsx의 활성 탭 표시(불투명 채움이 아니라
// `border-accent text-fg`만 쓰는 밑줄 방식)와 같은 언어로 맞춘다 — `bg-accent/20`(반투명
// 골드 워시) + `text-accent`로 바꿔 "선택됨"은 여전히 뚜렷하되 불투명 블록은 없앤다.
//
// pill 마크업(2026-09-12·6차): StatusFilterChips.tsx와 거의 동일한 마크업을 각자 손으로
// 구현하고 있었고(같은 필터 줄에 나란히 렌더되는데도 padding·선택색 표현이 서로 달랐음),
// 공용 FilterPill로 추출했다 — src/components/FilterPill.tsx 주석 참고.

import type { LaneAxis } from "@/lib/lane";
import FilterPill from "@/components/FilterPill";
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
          <FilterPill key={lane} selected={isSelected} onClick={() => onSelect(lane)}>
            <LaneGlyph lane={lane} size={14} labelled />
            {laneLabel(lane)}
          </FilterPill>
        );
      })}
    </div>
  );
}
