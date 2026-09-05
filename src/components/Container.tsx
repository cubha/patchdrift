// src/components/Container.tsx
// 공통 레이아웃 컨테이너 — max-width(--container-max)·반응형 gutter(--container-gutter-*).
// 프로토타입 `.container` 1:1 (docs/design/prototype/01-briefing-home.html 참고).

import type { ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export default function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[var(--container-max)] px-[var(--container-gutter-phone)] md:px-[var(--container-gutter-tablet)] lg:px-[var(--container-gutter-desktop)] ${className}`}
    >
      {children}
    </div>
  );
}
