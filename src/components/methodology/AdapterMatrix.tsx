// src/components/methodology/AdapterMatrix.tsx
// 어댑터 매핑표 렌더 — HANDOFF-redesign-2026-09-10.md §4-4. 레이아웃은 기존 방법론 표
// 스타일(StatusDefinitionTable.tsx)을 그대로 따른다("레이아웃은 그대로" 원칙). 순수 렌더.

import { ADAPTER_MATRIX, JUDGMENT_ENGINE_NOTE, type AdapterStatus } from "./adapterMatrixData";

const STATUS_LABEL: Record<AdapterStatus, string> = {
  designed: "어댑터 확정 · 미연결",
  "verified-unconnected": "API 실측 완료 · 미연결",
};

const STATUS_CLASSES: Record<AdapterStatus, string> = {
  designed: "border-border text-fg-2",
  "verified-unconnected": "border-accent text-accent",
};

export default function AdapterMatrix() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
                계층
              </th>
              <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
                LoL (현재)
              </th>
              <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
                PUBG (확장 설계)
              </th>
              <th className="border-b border-border-soft px-5 py-3 text-left text-xs font-bold text-muted">
                PUBG 상태
              </th>
            </tr>
          </thead>
          <tbody>
            {ADAPTER_MATRIX.map((row) => (
              <tr key={row.layer}>
                <td className="border-b border-border-soft px-5 py-4 align-top font-bold text-fg">
                  {row.layer}
                </td>
                <td className="border-b border-border-soft px-5 py-4 align-top text-fg-2">{row.lol}</td>
                <td className="border-b border-border-soft px-5 py-4 align-top text-fg-2">{row.pubg}</td>
                <td className="border-b border-border-soft px-5 py-4 align-top">
                  <span
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-sm border px-2 py-1 font-mono text-xs font-bold ${STATUS_CLASSES[row.pubgStatus]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-pill bg-current" aria-hidden="true" />
                    {STATUS_LABEL[row.pubgStatus]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 pb-5 text-xs text-muted">{JUDGMENT_ENGINE_NOTE}</p>
      <p className="px-5 pb-5 text-xs text-muted">
        PUBG 수집 수치: 0건 — 이번 릴리즈는 매핑 설계까지만 확정하고 실연결은 범위 밖이다(도그푸딩
        일정 확보 우선, HANDOFF-redesign-2026-09-10.md §6·§8).
      </p>
    </div>
  );
}
