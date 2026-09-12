// src/components/home/StreamLaneFilter.tsx
// 홈 좌측 컬럼의 라인 필터 — 2026-09-12(4차, R2) ReleaseNoteStream에서 분리했다. 이유:
// StreamColumnLayout이 좌/우 컬럼 상단을 CSS Grid 행(row1=필터, row2=본문)으로 정렬하려면
// 필터가 리스트 패널과 별도 그리드 셀이어야 한다 — 이전에는 ReleaseNoteStream 내부에 필터+패널이
// 함께 있어 리스트 패널의 상단이 우측 컬럼 첫 패널보다 (필터 높이+gap)만큼 아래로 밀려 어긋나
// 보였다(사용자 실측 지적).
//
// 선택 라인 상태 소유권(AmbientContext)은 그대로다 — 이 컴포넌트는 그 상태를 <LaneFilter>에
// 연결하는 얇은 어댑터일 뿐 새 시각 요소를 만들지 않는다.
"use client";

import LaneFilter from "@/components/LaneFilter";
import { useAmbient } from "@/components/AmbientContext";

export default function StreamLaneFilter() {
  const { selectedLane, setSelectedLane } = useAmbient();
  return <LaneFilter selected={selectedLane} onSelect={setSelectedLane} />;
}
