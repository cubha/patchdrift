// src/components/home/IndirectEffectPanel.tsx
// 홈 "간접 영향" 전용 섹션(ST-IE7, 2026-09-13) — 노트에 직접 조항은 없지만 다른 조항의
// 파급효과로 설명되는 변화를 **인과 체인 한 줄**로 보여준다.
//
// 사용자 정의(PLAN-indirect-effect-status-2026-09-13.md ①): "드레이븐에 대한 패치내용이 없는데
// 드레이븐 승률과 픽률이 큰폭으로 감소 → 드레이븐이 첫 코어템으로 가는 아이템의 너프가 있었음
// → 라인전 포텐셜이 약해져 자연스레 승률/픽률 감소". 그래서 이 패널의 한 행은 반드시
// `관측(엔티티·지표·Δ)` → `원인(섹션·엔티티)` 두 항을 나란히 보여준다.
//
// 릴리즈 스트림에는 이 행들이 나오지 않는다(옵션 B — releaseStream.ts가 unannounced만 그룹핑).
// 순수 렌더(서버 컴포넌트) — 선택·해석은 indirectEffects.ts가 끝내고 여기는 그리기만 한다.
// 스타일은 LaneGapPanel 등 기존 사이드 패널과 동일한 SectionCard variant="glass"를 따른다.

import Link from "next/link";
import SectionCard from "@/components/SectionCard";
import StatusBadge from "@/components/StatusBadge";
import { entityTypeLabel, itemHref, metricLabel } from "@/lib/format";
import { formatMetricValue } from "./logic";
import type { IndirectEffectEntry } from "./indirectEffects";

export interface IndirectEffectPanelProps {
  entries: IndirectEffectEntry[];
}

const SECTION_LABELS: Record<string, string> = {
  champion: "챔피언",
  item: "아이템",
  system: "시스템",
  other: "기타",
};

export default function IndirectEffectPanel({ entries }: IndirectEffectPanelProps) {
  return (
    <SectionCard
      eyebrow="노트에 없는 파급효과"
      title="간접 영향"
      variant="glass"
      action={
        <Link href="/compare/#indirect-effect" className="text-xs font-bold text-accent hover:underline">
          전체 보기 →
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          이 패치 쌍에서는 다른 조항의 파급효과로 설명되는 변화가 없습니다
        </p>
      ) : (
        <ul>
          {entries.map(({ record, causeText, causeEntity, causeSection, causeAnchor }) => (
            <li key={record.id} className="border-b border-border-soft px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={record.status} />
                <Link href={itemHref(record.id)} className="text-sm font-bold text-fg hover:text-accent">
                  {record.entityName}
                </Link>
                <span className="text-xs text-muted">
                  {entityTypeLabel(record.entityType)} · {metricLabel(record.metric)}
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-fg">
                  {formatMetricValue(record.delta, record.metric)}
                </span>
              </div>

              {/* 인과 체인 — 관측(위) ← 원인(아래). 원인 노트를 못 찾으면 링크 없이 텍스트만
                  남긴다(무근거는 링크를 걸지 않는다는 CLAUDE.md 원칙). */}
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-fg-2">
                <span aria-hidden="true" className="text-muted">
                  ←
                </span>
                {causeEntity ? (
                  <>
                    <span className="text-xs text-muted">
                      [{causeSection ? (SECTION_LABELS[causeSection] ?? causeSection) : "노트"}]
                    </span>
                    {causeAnchor ? (
                      <a
                        href={causeAnchor}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-accent hover:underline"
                      >
                        {causeEntity}
                      </a>
                    ) : (
                      <span className="font-bold text-fg">{causeEntity}</span>
                    )}
                    <span className="text-muted">변경의 파급</span>
                  </>
                ) : (
                  <span className="text-muted">원인 노트 확인 불가</span>
                )}
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted">{causeText}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
