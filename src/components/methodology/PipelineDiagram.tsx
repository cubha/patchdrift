// src/components/methodology/PipelineDiagram.tsx
// 방법론 페이지 "데이터 파이프라인" 4단(ST-12 ①) — flex 카드 + 화살표(프로토타입 04는 인라인
// SVG를 쓰지만, 과제 지시가 "인라인 SVG 또는 flex 카드 + 화살표" 중 택1을 허용해 픽셀 단위
// viewBox 좌표를 복제하는 대신 토큰 유틸 기반 flex 카드를 택했다 — 반응형에도 더 안전하다).
//
// 2026-09-12(5차 연속, 사용자 지적 "card도 단색 평면 디자인"): `bg-surface-warm` 단일색 →
// `.card-surface`(src/styles/panel.css, 깊이 그라디언트)로 교체.
//
// 2026-09-12(6차): 카드 div를 손으로 반복 작성하던 것을 공용 Card 컴포넌트로 교체 —
// src/components/Card.tsx 주석 참고. 원래 이 컴포넌트만 `border-border`(GateGrid는
// `border-border-soft`)를 썼던 드리프트도 Card의 고정 보더로 흡수됐다. flex 레이아웃은
// 이 컴포넌트 전용이라 className으로 얹는다.

import Card from "@/components/Card";
import type { PipelineStepView } from "./pipelineSteps";

export interface PipelineDiagramProps {
  steps: PipelineStepView[];
}

export default function PipelineDiagram({ steps }: PipelineDiagramProps) {
  return (
    <div
      className="flex flex-col flex-wrap items-stretch gap-3 p-5 sm:flex-row sm:items-center"
      role="img"
      aria-label="수집, 집계, 짝짓기, 판정 4단 파이프라인 다이어그램"
    >
      {steps.map((step, i) => (
        <div key={step.step} className="flex flex-1 items-center gap-3">
          <Card className="flex flex-1 flex-col gap-2">
            <span className="font-mono text-xs font-bold text-accent">STEP {step.step}</span>
            <span className="font-display text-base font-bold text-fg">{step.title}</span>
            <span className="text-xs text-fg-2">{step.detail}</span>
            <div className="mt-1 flex flex-col gap-0.5 font-mono text-xs text-muted">
              {step.meta.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </Card>
          {i < steps.length - 1 ? (
            <span className="text-lg text-muted" aria-hidden="true">
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
