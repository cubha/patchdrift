// src/components/home/UnannouncedList.tsx
// 미공지 변화 목록(첫 컷) — 프로토타입 `.delta-row` 1:1(docs/design/prototype/01-briefing-home.html
// "우선 1 · 차별 핵심"). 서버 컴포넌트.

import Link from "next/link";
import type { DeltaRecord } from "@/pipeline/types";
import { fmtInt, itemHref, metricLabel } from "@/lib/format";
import EntityIcon from "@/components/EntityIcon";
import SectionCard from "@/components/SectionCard";
import DeltaValue from "@/components/DeltaValue";
import { entityFallbackLabel, formatMetricValue, metricKind, resolveCause } from "./logic";

export interface UnannouncedListProps {
  rows: DeltaRecord[];
}

export default function UnannouncedList({ rows }: UnannouncedListProps) {
  return (
    <SectionCard
      eyebrow="우선 1 · 차별 핵심"
      title="미공지 변화"
      action={
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-sm border border-accent px-2 py-1 font-mono text-xs font-bold text-accent">
          <span className="h-1.5 w-1.5 rounded-pill bg-current" aria-hidden="true" />
          미공지 {fmtInt(rows.length)}
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          이 패치 쌍에서는 통계 게이트를 통과한 미공지 변화가 없습니다
        </p>
      ) : (
        <ul>
          {rows.map((row) => {
            const cause = resolveCause(row);
            return (
              <li
                key={row.id}
                className="grid grid-cols-[32px_1.5fr_1fr_1fr_1.6fr_auto] items-center gap-4 border-b border-border-soft px-5 py-4 last:border-b-0"
              >
                <EntityIcon
                  entityType={row.entityType}
                  entityKey={row.entityKey}
                  name={row.entityName}
                  fallbackLabel={entityFallbackLabel(row)}
                />
                <div>
                  <div className="text-sm font-bold text-fg">{row.entityName}</div>
                  <div className="text-xs text-muted">
                    {row.entityType === "objective" ? "오브젝트 타이밍" : metricLabel(row.metric)}
                  </div>
                </div>
                <div className="text-xs text-muted">
                  {formatMetricValue(row.before, row.metric)} →{" "}
                  <span className="font-mono tabular-nums text-fg">
                    {formatMetricValue(row.after, row.metric)}
                  </span>
                </div>
                <DeltaValue delta={row.delta} ci={row.ci} kind={metricKind(row.metric)} />
                <div className="text-xs text-muted">
                  추정 원인:{" "}
                  {cause.mode === "verified" ? (
                    <Link href={itemHref(row.id)} className="text-accent hover:underline">
                      {cause.text}
                    </Link>
                  ) : (
                    cause.text
                  )}
                </div>
                <Link href={itemHref(row.id)} className="text-xs font-bold text-accent hover:underline">
                  근거 보기 →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
