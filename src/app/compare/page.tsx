// src/app/compare/page.tsx
// 대조표 — 좌 패치노트 항목 내비게이터 + 우 델타 테이블 스텁(UX-BRIEF §3 "02 대조표").
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).
// TODO(F5): 상태 필터 칩·내비게이터·델타 테이블·커버리지 바 + FilterBar에 실 데이터(pairs·
// currentPair·n·aggregatedAt) 연결(현재는 전부 optional prop 기본값으로 표시만 됨)

import FilterBar from "@/components/FilterBar";

export default function ComparePage() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <FilterBar />
      <main className="flex flex-1 items-center justify-center text-muted">
        TODO: 대조표
      </main>
    </div>
  );
}
