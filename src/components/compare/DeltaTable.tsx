// src/components/compare/DeltaTable.tsx
// 우 델타 테이블(2/3) — 프로토타입 `table.delta-table` 1:1(docs/design/prototype/02-comparison-table.html).
// 순수 프레젠테이션 — 정렬 상태·선택 하이라이트는 부모 CompareExplorer가 소유.

import Link from "next/link";
import type { DeltaRecord } from "@/pipeline/types";
import { itemHref, metricLabel } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { formatMetricValue } from "@/components/home/logic";
import { directionSymbol, formatCiCell, formatDeltaCell, formatNCell, shortNoteId, type SortKey } from "./logic";

export interface DeltaTableProps {
  pair: { from: string; to: string } | null;
  rows: DeltaRecord[];
  highlightNoteId: string | null;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}

function sortIndicator(key: SortKey, activeKey: SortKey, dir: "asc" | "desc"): string {
  if (key !== activeKey) return "↕";
  return dir === "desc" ? "▼" : "▲";
}

export default function DeltaTable({ pair, rows, highlightNoteId, sortKey, sortDir, onSort }: DeltaTableProps) {
  const fromLabel = pair?.from ?? "이전";
  const toLabel = pair?.to ?? "이후";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm tabular-nums">
        <thead>
          <tr>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left" />
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              엔티티
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              지표
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              {fromLabel}
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              {toLabel}
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              <button type="button" onClick={() => onSort("absDelta")} className="inline-flex items-center gap-1">
                Δ <span aria-hidden="true">{sortIndicator("absDelta", sortKey, sortDir)}</span>
              </button>
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              <button type="button" onClick={() => onSort("q")} className="inline-flex items-center gap-1">
                95% CI <span aria-hidden="true">{sortIndicator("q", sortKey, sortDir)}</span>
              </button>
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              <button type="button" onClick={() => onSort("n")} className="inline-flex items-center gap-1">
                n <span aria-hidden="true">{sortIndicator("n", sortKey, sortDir)}</span>
              </button>
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              상태
            </th>
            <th scope="col" className="whitespace-nowrap border-b border-border-soft px-4 py-3 text-left font-body text-xs font-bold text-muted">
              짝
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center font-body text-sm text-muted">
                표시할 델타가 없습니다
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const dir = directionSymbol(row);
              const highlighted = highlightNoteId !== null && row.matchedNoteIds.includes(highlightNoteId);
              return (
                <tr
                  key={row.id}
                  className={`border-b border-border-soft ${
                    highlighted ? "bg-[color-mix(in_oklab,var(--accent),transparent_90%)]" : ""
                  }`}
                >
                  <td className={`px-4 py-3 ${dir.colorClass}`}>{dir.symbol}</td>
                  <td className="px-4 py-3 font-body">
                    <Link href={itemHref(row.id)} className="text-fg hover:text-accent hover:underline">
                      {row.entityName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-body text-fg-2">{metricLabel(row.metric)}</td>
                  <td className="px-4 py-3">{formatMetricValue(row.before, row.metric)}</td>
                  <td className="px-4 py-3">{formatMetricValue(row.after, row.metric)}</td>
                  <td className={`px-4 py-3 ${dir.colorClass}`}>{formatDeltaCell(row)}</td>
                  <td className="px-4 py-3 text-fg-2">{formatCiCell(row)}</td>
                  <td className="px-4 py-3 text-fg-2">{formatNCell(row)}</td>
                  <td className="px-4 py-3 font-body">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-2">{shortNoteId(row.matchedNoteId)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
