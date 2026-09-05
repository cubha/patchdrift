// src/components/methodology/GateGrid.tsx
// 방법론 페이지 "통계 게이트" 카드 4개(ST-12 ③) — 1차축/2차축/신뢰구간/다중비교 보정.
// minN·alpha는 하드코딩하지 않고 page.tsx가 src/pipeline/aggregate/stats.ts에서 import한
// WIN_RATE_MIN_N·FDR_ALPHA를 prop으로 내려받는다(과제 지시 — 방법론 화면 수치는 상수 import,
// 하드코딩 금지).

export interface GateGridProps {
  minN: number;
  alpha: number;
}

export default function GateGrid({ minN, alpha }: GateGridProps) {
  const items = [
    {
      title: "1차축",
      body: "픽률·밴률·아이템 사용률·골드·오브젝트 타이밍. 표본 게이트 없이 방향성 우선 관측.",
    },
    {
      title: "2차축",
      body: `승률. n≥${minN} 게이트를 통과해야 델타를 제시하며, 미달 시 "표본 부족"으로 표기.`,
    },
    {
      title: "신뢰구간",
      body: "Wilson score interval로 비율 구간을, Newcombe method로 전/후 차이 구간을, Welch 근사로 연속 지표(골드·시간) 차이 구간을 산출.",
    },
    {
      title: "다중비교 보정",
      body: `Benjamini-Hochberg FDR q<${alpha}. 수백 개 지표를 동시 검정할 때 거짓양성을 통제.`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-md border border-border-soft bg-surface-warm p-4">
          <h3 className="font-display text-sm font-bold text-fg">{item.title}</h3>
          <p className="mt-2 text-xs text-muted">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
