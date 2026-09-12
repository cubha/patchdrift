// src/lib/panelSurface.ts
// 패널 표면 클래스 조합 단일 소유(2026-09-12·6차, 사용자 지적 "반복 사용되는 판넬... 컴포넌트화
// 하여 동일한 영역이 동일한 스타일을 보장"). `"panel-surface panel-surface-glass"` 리터럴이
// SectionCard.tsx·CompareExplorer.tsx·NoteNavigator.tsx·HeroSummary.tsx·ReleaseNoteStream.tsx
// (2곳) 총 6곳에 손으로 복붙돼 있었다 — R6.1~R6.2에서 실제로 이 리터럴을 빠뜨리거나 잘못
// 적용해 재작업한 이력이 반복됐다. SectionCard처럼 헤더 구조를 강제하는 컴포넌트로 묶을 수
// 없는 소비처(리스트 `<ul>`, `<section>` 래퍼 등 구조가 제각각)라 마크업 전체를 컴포넌트화
// 하지 않고, 클래스 문자열 조합만 함수로 고정해 오타·누락을 원천 차단한다.

export type PanelVariant = "opaque" | "glass";

export function panelSurfaceClass(variant: PanelVariant = "opaque"): string {
  return variant === "glass" ? "panel-surface panel-surface-glass" : "panel-surface";
}
