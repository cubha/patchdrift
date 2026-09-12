// src/components/FilterPill.tsx
// 필터 pill 버튼 — LaneFilter.tsx·StatusFilterChips.tsx가 각자 만들던 "선택/비선택 pill"
// 마크업을 하나로 합친다(2026-09-12·6차, 사용자 지적 "반복 사용되는 판넬이나 카드, Label,
// 뱃지 등을 컴포넌트화하여 동일한 영역이 동일한 스타일을 보장할 수 있도록"). 두 컴포넌트가
// CompareExplorer.tsx의 같은 필터 줄에 나란히 쓰이는데도 padding·gap이 다르고, 선택 상태
// 배경이 LaneFilter는 토큰 유틸(`bg-accent/20`), StatusFilterChips는 arbitrary 값
// (`bg-[color-mix(...)]`, 토큰 우회)으로 갈라져 있었다 — 매번 사람이 잡아줘야 했던 반복
// 결함. 이제 이 컴포넌트 하나가 pill의 테두리·배경·타이포·selected 로직을 소유하고,
// 소비자는 라벨 콘텐츠(텍스트 또는 아이콘+텍스트)만 넘긴다.

import type { ReactNode } from "react";

export interface FilterPillProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export default function FilterPill({ selected, onClick, children, className = "" }: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
        selected
          ? "border-accent bg-accent/20 text-accent"
          : "border-border-soft text-fg-2 hover:border-border hover:text-fg"
      } ${className}`}
    >
      {children}
    </button>
  );
}
