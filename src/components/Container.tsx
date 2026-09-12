// src/components/Container.tsx
// 공통 레이아웃 컨테이너 — max-width(--container-max)·반응형 gutter(--container-gutter-*).
// 프로토타입 `.container` 1:1 (docs/design/prototype/01-briefing-home.html 참고).
//
// `width` prop(2026-09-12·3차, Q3 "안 L1"): 항목상세 페이지만 `--container-narrow`(1040px)로
// 좁힌다. 전역 `--container-max`(1320px)는 건드리지 않는다 — 홈·대조표는 표가 넓어야 하고,
// "전역 Container 폭 축소"는 이전 라운드에서 이미 기각됐다(효과가 보는 사람 화면 폭에 전적으로
// 의존하는 도박이라는 근거). 이 prop은 소비처 단위로 좁히는 경로만 연다.
import type { ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** "default"(1320px, 기존) | "narrow"(1040px — 항목상세 전용). 미지정 시 default. */
  width?: "default" | "narrow";
}

const WIDTH_VAR: Record<NonNullable<ContainerProps["width"]>, string> = {
  default: "var(--container-max)",
  narrow: "var(--container-narrow)",
};

export default function Container({ children, className = "", width = "default" }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-[var(--container-gutter-phone)] md:px-[var(--container-gutter-tablet)] lg:px-[var(--container-gutter-desktop)] ${className}`}
      style={{ maxWidth: WIDTH_VAR[width] }}
    >
      {children}
    </div>
  );
}
