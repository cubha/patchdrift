// src/components/Card.tsx
// 중첩 카드(2차) 표면 — PipelineDiagram.tsx STEP 카드·GateGrid.tsx 게이트 카드가 같은
// `.card-surface`(src/styles/panel.css) 채움을 쓰면서도 보더 색만 각자 다르게 적어 놓았다
// (하나는 `border-border`, 하나는 `border-border-soft`) — 2026-09-12·6차, 사용자 지적
// "반복 사용되는 판넬이나 카드... 컴포넌트화" 대상. 패널 레벨(`.panel-surface`)도
// `border-border-soft`를 쓰므로 이 카드 레벨도 같은 보더 톤으로 고정해 위계 언어를 통일한다.
// SectionCard와 달리 헤더(eyebrow/title) 구조를 강제하지 않는다 — 소비처마다 내부 레이아웃이
// 다르므로(플렉스 컬럼 vs 자유 형식) children을 그대로 감싸기만 한다.

import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`card-surface rounded-md border border-border-soft p-4 ${className}`}>{children}</div>;
}
