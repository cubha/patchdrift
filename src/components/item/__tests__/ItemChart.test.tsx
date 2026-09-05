// ItemChart 렌더 검증 — 빈 데이터(hasData=false) 문구 + 값 있는 케이스 렌더 확인.
// recharts는 jsdom에서 ResponsiveContainer가 0×0으로 측정돼 내부 svg를 그리지 않을 수 있으므로,
// 여기서는 "크래시 없이 렌더되는지" + 빈 데이터 문구/값 텍스트만 검증한다(components.test.tsx와
// 동일하게 jest-dom 매처 없이 container.textContent만 사용 — vitest.config.ts 비소유).
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ItemChart from "../ItemChart";
import { buildChartData } from "../chartData";
import type { DeltaRecord } from "@/pipeline/types";

function makeDelta(overrides: Partial<DeltaRecord> = {}): DeltaRecord {
  return {
    id: "champion:Trundle:pickRate",
    entityType: "champion",
    entityKey: "Trundle",
    entityName: "트런들",
    metric: "pickRate",
    before: 0.021,
    after: 0.046,
    delta: 0.025,
    ci: [0.021, 0.029],
    n: { before: 10240, after: 10118 },
    q: 0.004,
    status: "unannounced",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "x", noteAnchor: null },
    ...overrides,
  };
}

describe("ItemChart", () => {
  it("before/after가 null이면 빈 데이터 문구를 렌더한다", () => {
    const data = buildChartData(makeDelta({ before: null, after: null, delta: null }));
    const { container } = render(<ItemChart data={data} />);
    expect(container.textContent).toContain("표시할 값이 없습니다");
  });

  it("값이 있으면 전/후 포맷된 값을 렌더한다", () => {
    const data = buildChartData(makeDelta());
    const { container } = render(<ItemChart data={data} />);
    expect(container.textContent).toContain("2.1%");
    expect(container.textContent).toContain("4.6%");
  });

  it("errorSuppressed면 표본 부족 안내 문구를 렌더한다", () => {
    const data = buildChartData(makeDelta({ status: "insufficient-sample" }), "전", "후", true);
    const { container } = render(<ItemChart data={data} />);
    expect(container.textContent).toContain("표본 부족으로 신뢰구간을 생략합니다");
  });
});
