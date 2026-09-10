// src/components/compare/DeltaTable.tsx
// 우 델타 테이블(2/3) — 프로토타입 `table.delta-table` 1:1(docs/design/prototype/02-comparison-table.html).
// 순수 프레젠테이션 — 정렬 상태·선택 하이라이트는 부모 CompareExplorer가 소유.

import Link from "next/link";
import type { DeltaRecord, LanePosition } from "@/pipeline/types";
import { itemHref, metricLabel, positionLabel } from "@/lib/format";
import { parseLaneAxis } from "@/lib/lane";
import EntityIcon from "@/components/EntityIcon";
import LaneGlyph from "@/components/LaneGlyph";
import StatusBadge from "@/components/StatusBadge";
import { entityFallbackLabel, formatMetricValue } from "@/components/home/logic";
import { directionSymbol, formatCiCell, formatDeltaCell, formatNCell, shortNoteId, type SortKey } from "./logic";

/** 행의 엔티티 열 아이콘 — entityType==="lane"(라인 골드 지표, 챔피언 자산 없음)은 라인 글리프로,
 * 그 외는 기존 EntityIcon(champion/item은 ddragon 이미지, objective/summary는 폴백 글자)로.
 * HANDOFF-redesign-2026-09-10.md §4-2 "라인 행(바텀·미드 등)은 챔피언 자산이 없다 → '골' 텍스트
 * 박스를 라인 글리프 박스로 교체". */
function RowIcon({ row, size }: { row: DeltaRecord; size: number }) {
  if (row.entityType === "lane") {
    return (
      <span
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-sm border border-border bg-surface-warm text-fg-2"
      >
        <LaneGlyph lane={row.entityKey as LanePosition} size={Math.round(size * 0.6)} labelled />
      </span>
    );
  }
  return (
    <EntityIcon
      entityType={row.entityType}
      entityKey={row.entityKey}
      name={row.entityName}
      fallbackLabel={entityFallbackLabel(row)}
      size={size}
    />
  );
}

/** 챔피언 position-scope 행(4세그먼트 id)의 라인 태그 — "엔티티 열 하위에 라인 태그(글리프 +
 * '탑 · 승률')"(HANDOFF §4-2). scope=all·라인 파싱 불가(non-champion)면 렌더하지 않는다. */
function LaneTag({ row }: { row: DeltaRecord }) {
  if (row.entityType !== "champion") return null;
  const lane = parseLaneAxis(row.id);
  if (lane === null || lane === "all") return null;
  return (
    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
      <LaneGlyph lane={lane} size={12} labelled />
      {positionLabel(lane)} · {metricLabel(row.metric)}
    </span>
  );
}

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
                    <div className="flex items-center gap-3">
                      <RowIcon row={row} size={40} />
                      <div className="flex flex-col">
                        <Link href={itemHref(row.id)} className="text-fg hover:text-accent hover:underline">
                          {row.entityName}
                        </Link>
                        <LaneTag row={row} />
                      </div>
                    </div>
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
