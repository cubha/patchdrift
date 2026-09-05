// src/app/compare/page.tsx
// 대조표 — 프로토타입 02(docs/design/prototype/02-comparison-table.html) 구현. F5/ST-11.
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).
// 데이터 로드는 이 서버 컴포넌트에서만 한다 — 상태 필터·검색·정렬·선택 하이라이트 등 인터랙션은
// CompareExplorer('use client')로 위임한다.

import FilterBar from "@/components/FilterBar";
import CompareExplorer from "@/components/compare/CompareExplorer";
import { computeCoverage } from "@/components/compare/logic";
import { getDefaultPair, listPatchPairs, loadDeltas, loadNotes, loadSummary } from "@/lib/data";

export default function ComparePage() {
  const pair = getDefaultPair();
  const pairs = listPatchPairs();

  const deltas = pair ? loadDeltas(pair.from, pair.to) : null;
  const notes = pair ? loadNotes(pair.to) : null;
  const summaryTo = pair ? loadSummary(pair.to) : null;
  const summaryFrom = pair ? loadSummary(pair.from) : null;

  const rows = deltas?.rows ?? [];
  const coverage = computeCoverage(rows, notes);

  return (
    <div className="flex flex-1 flex-col bg-bg">
      <FilterBar
        pairs={pairs}
        currentPair={pair}
        nBefore={summaryFrom?.data.matches ?? null}
        nAfter={summaryTo?.data.matches ?? null}
        aggregatedAt={summaryTo?.meta.generatedAt ?? null}
      />
      <main className="flex-1">
        <CompareExplorer pair={pair} notes={notes?.items ?? []} rows={rows} coverage={coverage} />
      </main>
    </div>
  );
}
