// src/components/IconBox.tsx
// 아이콘/아바타 정사각 박스 프리미티브(2026-09-12·6차, /verify-impl 재검증 발견) —
// EntityIcon.tsx·SpellIcon.tsx의 폴백 박스, NoteNavigator.tsx의 "아이콘 정보 없음" 인라인
// 폴백, DeltaTable.tsx·ReleaseNoteRow.tsx의 라인 글리프 박스가 전부 같은 시각 역할(테두리+
// bg-surface-warm 정사각 박스)을 각자 손으로 재구현하고 있었다 — 첫 컴포넌트화 라운드는
// `.card-surface`(그라디언트 카드)만 찾아서 이 "평면 박스" 계열은 놓쳤다. 그 과정에서
// SpellIcon.tsx만 `border-border-soft`(나머지 5곳은 `border-border`)를 쓰던 드리프트도
// 있었다 — 다수 쪽으로 통일한다.

import type { ReactNode } from "react";

export interface IconBoxProps {
  size: number;
  className?: string;
  children: ReactNode;
}

export default function IconBox({ size, className = "", children }: IconBoxProps) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-warm text-fg-2 ${className}`}
    >
      {children}
    </span>
  );
}
