import { describe, expect, it } from "vitest";
import type { DeltaRecord } from "@/pipeline/types";
import { buildChartData } from "../chartData";

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

describe("buildChartData", () => {
  it("pp 지표는 퍼센트 스케일(×100)로 변환하고 after 막대에 CI 오프셋을 싣는다", () => {
    const data = buildChartData(makeDelta(), "26.16", "26.17");
    expect(data.kind).toBe("pp");
    expect(data.hasData).toBe(true);
    expect(data.bars[0]).toMatchObject({ key: "before", label: "26.16", chartValue: 2.1 });
    expect(data.bars[1].label).toBe("26.17");
    expect(data.bars[1].chartValue).toBeCloseTo(4.6, 5);
    // delta=0.025, ci=[0.021,0.029] → errLow=(0.025-0.021)*100=0.4, errHigh=(0.029-0.025)*100=0.4
    expect(data.bars[1].error[0]).toBeCloseTo(0.4, 5);
    expect(data.bars[1].error[1]).toBeCloseTo(0.4, 5);
    expect(data.bars[0].error).toEqual([0, 0]);
  });

  it("실측 self-pair(delta=0, 대칭 CI) 케이스도 오프셋을 정확히 계산한다", () => {
    const delta = makeDelta({
      before: 0.2139105522839408,
      after: 0.2139105522839408,
      delta: 0,
      ci: [-0.014339566749834307, 0.014339566749834307],
    });
    const data = buildChartData(delta);
    expect(data.bars[1].error[0]).toBeCloseTo(1.4339566749834307, 5);
    expect(data.bars[1].error[1]).toBeCloseTo(1.4339566749834307, 5);
  });

  it("sec/gold 지표는 스케일 1(원시값 그대로)", () => {
    const secData = buildChartData(makeDelta({ metric: "firstSec", before: 352, after: 330, delta: -22, ci: [-28, -16] }));
    expect(secData.kind).toBe("sec");
    expect(secData.bars[0].chartValue).toBe(352);
    expect(secData.bars[1].chartValue).toBe(330);

    const goldData = buildChartData(makeDelta({ metric: "goldAt14", before: 5000, after: 5320, delta: 320, ci: [235, 405] }));
    expect(goldData.kind).toBe("gold");
    expect(goldData.bars[1].chartValue).toBe(5320);
  });

  it("beforeLabel/afterLabel 기본값은 '전'/'후'", () => {
    const data = buildChartData(makeDelta());
    expect(data.bars[0].label).toBe("전");
    expect(data.bars[1].label).toBe("후");
  });

  it("before/after가 null이면 hasData=false, 오차 계산 없이 null 유지", () => {
    const data = buildChartData(makeDelta({ before: null, after: null, delta: null }));
    expect(data.hasData).toBe(false);
    expect(data.bars[0].chartValue).toBeNull();
    expect(data.bars[1].chartValue).toBeNull();
    expect(data.bars[1].error).toEqual([0, 0]);
    expect(data.errorSuppressed).toBe(false);
  });

  it("suppressError=true면(표본 부족) 값은 그대로 두고 오차 막대만 [0,0]으로 강제한다", () => {
    // 실측 재현: LeeSin TOP winRate, n=8 — ci가 극단으로 넓어짐(±39.8pp)
    const delta = makeDelta({
      metric: "winRate",
      before: 0.625,
      after: 0.625,
      delta: 0,
      ci: [-0.39830599422069674, 0.39830599422069674],
      n: { before: 8, after: 8 },
      status: "insufficient-sample",
    });
    const withError = buildChartData(delta);
    expect(withError.errorSuppressed).toBe(false);
    expect(withError.bars[1].error[0]).toBeGreaterThan(0);

    const suppressed = buildChartData(delta, "전", "후", true);
    expect(suppressed.hasData).toBe(true);
    expect(suppressed.errorSuppressed).toBe(true);
    expect(suppressed.bars[1].error).toEqual([0, 0]);
    // 값 자체(막대 높이)는 그대로 보존 — "델타 미제시"이지 "값 미제시"가 아니다.
    expect(suppressed.bars[0].chartValue).toBeCloseTo(62.5, 5);
    expect(suppressed.bars[1].chartValue).toBeCloseTo(62.5, 5);
  });
});
