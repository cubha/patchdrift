// src/components/methodology/StatusDefinitionTable.tsx
// 방법론 페이지 "상태 정의" 표(ST-12 ②) — 프로토타입 04 `.definition-table` 5행
// (공지-일치/공지-불일치/미공지/표본 부족/변화 없음, DESIGN-TOKENS.md 상태 색 문법).
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
}

function buildRows(minN: number, alpha: number): DefinitionRow[] {
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
      definition: "패치노트에 대응하는 조항이 없는 유의 변화",
      condition: `짝 없음 · q<${alpha}`,
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

export default function StatusDefinitionTable({ minN, alpha }: StatusDefinitionTableProps) {
  const rows = buildRows(minN, alpha);
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
