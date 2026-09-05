// src/components/methodology/PipelineDiagram.tsx
// 방법론 페이지 "데이터 파이프라인" 4단(ST-12 ①) — flex 카드 + 화살표(프로토타입 04는 인라인
// SVG를 쓰지만, 과제 지시가 "인라인 SVG 또는 flex 카드 + 화살표" 중 택1을 허용해 픽셀 단위
// viewBox 좌표를 복제하는 대신 토큰 유틸 기반 flex 카드를 택했다 — 반응형에도 더 안전하다).

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
          <div className="flex flex-1 flex-col gap-2 rounded-md border border-border bg-surface-warm p-4">
            <span className="font-mono text-xs font-bold text-accent">STEP {step.step}</span>
            <span className="font-display text-base font-bold text-fg">{step.title}</span>
            <span className="text-xs text-fg-2">{step.detail}</span>
            <div className="mt-1 flex flex-col gap-0.5 font-mono text-xs text-muted">
              {step.meta.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
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
