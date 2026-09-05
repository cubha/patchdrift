// src/components/SectionCard.tsx
// 패널 카드 헤더 패턴 — 프로토타입 `.panel`/`.panel-head`/`.panel-body` 1:1
// (docs/design/prototype/01-briefing-home.html `.panel-head` 참고). 우선순위 라벨(eyebrow)
// · 제목 · 우측 액션(뱃지·링크·버튼 등)을 헤더 한 줄에 배치한다.

import type { ReactNode } from "react";

export interface SectionCardProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({
  eyebrow,
  title,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-border bg-surface ${className}`}
      style={{ boxShadow: "var(--elev-ring)" }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border-soft px-5 py-5">
        <div>
          {eyebrow ? (
            <span className="block text-xs font-bold text-muted">{eyebrow}</span>
          ) : null}
          <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
