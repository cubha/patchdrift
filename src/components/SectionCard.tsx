// src/components/SectionCard.tsx
// 패널 카드 헤더 패턴 — 프로토타입 `.panel`/`.panel-head`/`.panel-body` 1:1
// (docs/design/prototype/01-briefing-home.html `.panel-head` 참고). 우선순위 라벨(eyebrow)
// · 제목 · 우측 액션(뱃지·링크·버튼 등)을 헤더 한 줄에 배치한다.
//
// 표면은 2026-09-12(3차)부터 `.panel-surface`(src/styles/panel.css) — 골드 4변 프레임
// (border-border 전체 + elev-ring)을 걷어내고 상단 2px 골드 레일 + 깊이 그라디언트 채움으로
// 교체했다(방향 제안 아티팩트 Q2 "A+B 결합"). 시안 v5의 패널은 애초에 `border-soft` + 평면
// `--surface`였다 — 골드 4변 프레임은 시안에 없던 것이었다. 본문 대비는 무영향(채움은 완전
// 불투명 그라디언트, 알파 변경 없음 — DESIGN-TOKENS.md 불변식 참고).
//
// variant="glass"(2026-09-12·5차, R6 — bg-visibility-proposal.html "옵션 B"): 카메라 노출
// 밴드(y<873px) 안에 들어오는 패널만 이 값을 받는다(현재는 SideMatchAverages 1곳). Container의
// `width` prop과 같은 선례를 따라 새 컴포넌트를 만들지 않고 prop으로 분기한다.

import type { ReactNode } from "react";

export interface SectionCardProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "opaque" | "glass";
}

export default function SectionCard({
  eyebrow,
  title,
  action,
  children,
  className = "",
  variant = "opaque",
}: SectionCardProps) {
  const surfaceClass = variant === "glass" ? "panel-surface panel-surface-glass" : "panel-surface";
  return (
    <section className={`${surfaceClass} overflow-hidden rounded-lg ${className}`}>
      <div className="panel-head-wash flex items-center justify-between gap-4 border-b border-border-soft px-5 py-5">
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
