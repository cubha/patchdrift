// src/app/compare/page.tsx
// 대조표 — 좌 패치노트 항목 내비게이터 + 우 델타 테이블 스텁(UX-BRIEF §3 "02 대조표").
// TODO(F5): 상태 필터 칩·내비게이터·델타 테이블·커버리지 바

import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";

export default function ComparePage() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <Header />
      <FilterBar />
      <main className="flex flex-1 items-center justify-center text-muted">
        TODO: 대조표
      </main>
    </div>
  );
}
