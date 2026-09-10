// src/components/home/HeroSummary.tsx
// 요약 카드(히어로) — 프로토타입 `.panel > .panel-body(.hero-headline/.hero-sub) + .stat-tile-grid`
// 1:1 (docs/design/prototype/01-briefing-home.html). 서버 컴포넌트(순수 렌더, 상태 없음).
// 스탯 타일 "공지된 변화"는 별도 델타 집계가 아니라 헤드라인의 N(noteEntityCount)을 그대로
// 재사용한다(코디네이터 확정, 2026-09-05 — HeadlineStats 주석 참고. 필드명은 2026-09-10
// noteEntityCount/noteItemCount로 분리됐다 — HANDOFF-redesign-2026-09-10.md §4-1).

import Link from "next/link";
import { fmtInt } from "@/lib/format";
import HeroAmbient from "./HeroAmbient";
import type { HeadlineStats } from "./logic";

export interface HeroSummaryProps {
  stats: HeadlineStats;
  /** 히어로 앰비언트 배경(HANDOFF §4-1). 미지정이면 그라디언트 워시만 — HeroAmbient.tsx 참고. */
  ambientSplashUrl?: string | null;
}

export default function HeroSummary({ stats, ambientSplashUrl = null }: HeroSummaryProps) {
  const { noteEntityCount, noteItemCount, statCount, unannouncedCount } = stats;

  return (
    <section
      className="overflow-hidden rounded-lg border border-border"
      style={{ boxShadow: "var(--elev-ring)" }}
    >
      <div className="relative overflow-hidden bg-bg p-5">
        <HeroAmbient splashUrl={ambientSplashUrl} />
        <p className="relative max-w-3xl text-2xl font-bold leading-tight text-fg">
          패치노트는{" "}
          <strong className="font-mono tabular-nums">
            {fmtInt(noteEntityCount)} 엔티티 / {fmtInt(noteItemCount)} 항목
          </strong>
          을 말했고, 통계는 <strong className="font-mono tabular-nums">{fmtInt(statCount)}개</strong> 변화를
          말합니다
        </p>
        <p className="relative mt-3 max-w-2xl text-sm text-muted">
          FDR q&lt;0.10 기준 · 1차축(픽·밴·아이템·골드·오브젝트) 유의 변화 집계 · 승률은 n≥200
          게이트 통과분만 제시
        </p>
      </div>
      <div className="grid grid-cols-3 border-t border-border-soft bg-surface">
        <div className="border-r border-border-soft p-5">
          <strong className="block font-display text-3xl font-bold tabular-nums text-fg">
            {fmtInt(noteEntityCount)}
          </strong>
          <span className="text-sm text-muted">공지된 변화 ({fmtInt(noteItemCount)}개 항목)</span>
        </div>
        <div className="border-r border-border-soft p-5">
          <strong className="block font-display text-3xl font-bold tabular-nums text-fg">
            {fmtInt(statCount)}
          </strong>
          <span className="text-sm text-muted">유의 변화</span>
        </div>
        <Link href="/compare/#unannounced" className="p-5 transition-colors hover:bg-surface-warm">
          <strong className="block font-display text-3xl font-bold tabular-nums text-accent">
            {fmtInt(unannouncedCount)}
          </strong>
          <span className="text-sm text-muted">미공지</span>
        </Link>
      </div>
    </section>
  );
}
