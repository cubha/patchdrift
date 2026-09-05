// src/components/StatusBadge.tsx
// 상태 뱃지 — DESIGN-TOKENS.md "상태 색 문법(구현 불변식)" 4종 + "no-change"(변화 없음, ST-08
// types.ts 확장) 1종 = 5종. 프로토타입 `.badge`/`.badge-*` 1:1(색만 토큰 유틸로 재구현).
// status는 MatchStatus로 좁히지 않고 string을 받는다 — 아직 정의되지 않은 미래 상태값이 와도
// (statusLabel과 동일한 방어적 원칙) 무너지지 않고 뉴트럴 처리한다.

import { statusLabel } from "@/lib/format";

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CLASSES: Record<string, string> = {
  "announced-consistent": "border-border text-fg-2",
  "announced-inconsistent": "border-danger text-danger",
  unannounced: "border-accent text-accent",
  "insufficient-sample": "border-warn text-warn",
  "no-change": "border-border-soft text-muted",
};

const FALLBACK_CLASSES = "border-border-soft text-muted";

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colorClasses = STATUS_CLASSES[status] ?? FALLBACK_CLASSES;
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-sm border px-2 py-1 font-mono text-xs font-bold ${colorClasses} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-current" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
