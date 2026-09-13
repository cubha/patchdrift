// src/components/methodology/StatusDefinitionTable.tsx
// 방법론 페이지 "상태 정의" 표(ST-12 ②) — 프로토타입 04 `.definition-table` 5행 + "임계 미달"
// (below-threshold) + "간접 영향"(indirect-effect) 2행 = 7행(둘 다 2026-09-13 신규).
// 뱃지는 공용 StatusBadge를 재사용해 색 문법이 한 곳(StatusBadge)에서만 정의되도록 한다.

import StatusBadge from "@/components/StatusBadge";
import type { MatchStatus } from "@/pipeline/types";

interface DefinitionRow {
  status: MatchStatus;
  definition: string;
  condition: string;
}

export interface StatusDefinitionTableProps {
  minN: number;
  alpha: number;
  /** 효과크기 바닥(비율, 0~1) — `aggregate/stats.ts` EFFECT_SIZE_FLOORS와 값이 어긋나지
   * 않도록 호출부(methodology/page.tsx)가 그 상수에서 직접 주입한다(하드코딩 금지). */
  pickFloor: number;
  banFloor: number;
  winFloor: number;
  /** 아이템 채택률 바닥은 상대변화 기준(예: 0.25 = 상대 25%) — 절대 %p가 아니다. */
  itemRelFloor: number;
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(0)}%`;
}

function buildRows(
  minN: number,
  alpha: number,
  pickFloor: number,
  banFloor: number,
  winFloor: number,
  itemRelFloor: number
): DefinitionRow[] {
  return [
    {
      status: "announced-consistent",
      definition: "패치노트 선언과 관측 델타의 방향이 일치",
      condition: `짝 존재 · 방향 일치 · q<${alpha}`,
    },
    {
      status: "announced-inconsistent",
      definition: "선언 방향과 관측 델타 방향이 다르거나 유의하지 않음",
      condition: "짝 존재 · 방향 불일치 또는 비유의",
    },
    {
      status: "unannounced",
      definition: "패치노트에 대응하는 조항이 없고, 추정 원인도 찾지 못한 유의 변화",
      condition: `짝 없음 · q<${alpha} · 효과크기 바닥 이상 · 검증된 원인 후보 없음`,
    },
    {
      status: "indirect-effect",
      definition: "직접 조항은 없지만 다른 조항의 파급효과로 설명되는 변화(예: 챔피언 노트는 없는데 그 챔피언이 올리는 아이템이 변경됨)",
      condition: "짝 없음 · 검증된 원인 후보 confidence≥medium",
    },
    {
      status: "below-threshold",
      definition: "통계적으로는 유의하나 실무상 무시 가능한 규모(효과크기 바닥 미달)",
      condition: `짝 없음 · q<${alpha} · |Δ|<바닥(픽 ${pct(pickFloor)}p/밴 ${pct(banFloor)}p/승 ${pct(
        winFloor
      )}p, 채택률 상대 ${pct(itemRelFloor)})`,
    },
    {
      status: "insufficient-sample",
      definition: `최소 표본(n≥${minN}) 미달로 승률 등 델타를 제시하지 않음`,
      condition: `n<${minN}`,
    },
    {
      status: "no-change",
      definition: "짝도 없고 통계적으로도 유의한 변화가 없음",
      condition: `짝 없음 · q≥${alpha} 또는 CI가 0 포함`,
    },
  ];
}

export default function StatusDefinitionTable({
  minN,
  alpha,
  pickFloor,
  banFloor,
  winFloor,
  itemRelFloor,
}: StatusDefinitionTableProps) {
  const rows = buildRows(minN, alpha, pickFloor, banFloor, winFloor, itemRelFloor);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
              상태
            </th>
            <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
              정의
            </th>
            <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
              판정 조건
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.status}>
              <td className="border-b border-border-soft px-5 py-4 align-top">
                <StatusBadge status={row.status} />
              </td>
              <td className="border-b border-border-soft px-5 py-4 align-top text-fg-2">
                {row.definition}
              </td>
              <td className="border-b border-border-soft px-5 py-4 align-top text-muted">
                {row.condition}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
