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

// ST-E: 저장된 CI(챔피언 pick/ban/win, 아이템 adoptionRate)가 있으면 before/after 각 막대에
// "그 패치 자신의" CI를 오프셋으로 얹는다. 저장 CI가 없는 metric은 기존 델타-CI 폴백을 그대로
// 쓴다(위 describe의 기존 케이스들이 전부 storedCi 미지정으로 이미 그 회귀를 검증한다).
describe("buildChartData — storedCi(패치별 자기 CI) 오프셋", () => {
  it("CI 있는 metric(pickRate)은 before/after 각각 자기 패치 CI로 오프셋을 계산한다", () => {
    const delta = makeDelta({
      metric: "pickRate",
      before: 0.02,
      after: 0.05,
      delta: 0.03,
      ci: [0.02, 0.04], // 델타 CI — storedCi가 쓰이면 무시돼야 함(값이 다르므로 오염 시 테스트 실패)
    });
    const data = buildChartData(delta, "26.16", "26.17", false, {
      before: [0.015, 0.024],
      after: [0.044, 0.058],
    });
    expect(data.bars[0].chartValue).toBeCloseTo(2, 5);
    expect(data.bars[1].chartValue).toBeCloseTo(5, 5);
    // before: (0.02-0.015)*100=0.5, (0.024-0.02)*100=0.4
    expect(data.bars[0].error[0]).toBeCloseTo(0.5, 5);
    expect(data.bars[0].error[1]).toBeCloseTo(0.4, 5);
    // after: (0.05-0.044)*100=0.6, (0.058-0.05)*100=0.8
    expect(data.bars[1].error[0]).toBeCloseTo(0.6, 5);
    expect(data.bars[1].error[1]).toBeCloseTo(0.8, 5);
  });

  it("CI 없는 metric(firstSec 등)은 storedCi를 넘겨도 무시하고 기존 델타-CI 폴백을 유지한다(회귀)", () => {
    const delta = makeDelta({
      metric: "firstSec",
      before: 352,
      after: 330,
      delta: -22,
      ci: [-28, -16],
    });
    // kind="sec"이므로 이 storedCi는 애초에 유효한 신호가 아니다 — 적용되면 안 된다.
    const data = buildChartData(delta, "26.16", "26.17", false, {
      before: [340, 360],
      after: [320, 340],
    });
    expect(data.kind).toBe("sec");
    expect(data.bars[0].error).toEqual([0, 0]);
    // 델타-CI 폴백: (−22−(−28))=6, (−16−(−22))=6
    expect(data.bars[1].error[0]).toBeCloseTo(6, 5);
    expect(data.bars[1].error[1]).toBeCloseTo(6, 5);
  });

  it("storedCi 한쪽이 null(예: winRate n게이트 미달로 ci.win===null)이면 오프셋을 표시하지 않고 조용히 델타-CI로 폴백한다", () => {
    const delta = makeDelta({
      metric: "winRate",
      before: 0.5,
      after: 0.52,
      delta: 0.02,
      ci: [0.01, 0.03],
    });
    const data = buildChartData(delta, "26.16", "26.17", false, {
      before: [0.45, 0.55],
      after: null, // 게이트 미달로 CI 없음
    });
    // 델타-CI 폴백: before 막대는 [0,0], after 막대는 delta.ci 기반
    expect(data.bars[0].error).toEqual([0, 0]);
    expect(data.bars[1].error[0]).toBeCloseTo(1, 5); // (0.02-0.01)*100
    expect(data.bars[1].error[1]).toBeCloseTo(1, 5); // (0.03-0.02)*100
  });

  it("storedCi를 아예 넘기지 않으면(champions.json 부재 등으로 호출부가 조회 못한 경우) 크래시 없이 기존 델타-CI 폴백으로 떨어진다", () => {
    const delta = makeDelta();
    expect(() => buildChartData(delta, "26.16", "26.17")).not.toThrow();
    const data = buildChartData(delta, "26.16", "26.17");
    expect(data.bars[1].error[0]).toBeCloseTo(0.4, 5);
    expect(data.bars[1].error[1]).toBeCloseTo(0.4, 5);
  });

  it("오프셋은 항상 0 이상 — 값이 저장 CI 구간을 벗어나도 음수를 반환하지 않는다", () => {
    const delta = makeDelta({
      metric: "pickRate",
      before: 0.02, // 구간 하한보다 작음
      after: 0.03, // 구간 상한보다 큼
      delta: 0.01,
      ci: [0.005, 0.015],
    });
    const data = buildChartData(delta, "26.16", "26.17", false, {
      before: [0.021, 0.03], // before(0.02) < lo(0.021) → errLow 음수화 방지
      after: [0.01, 0.028], // after(0.03) > hi(0.028) → errHigh 음수화 방지
    });
    expect(data.bars[0].error[0]).toBe(0);
    expect(data.bars[1].error[1]).toBe(0);
  });

  it("suppressError=true가 storedCi보다 우선한다 — 둘 다 있어도 오차 막대는 [0,0]", () => {
    const delta = makeDelta({ metric: "pickRate", before: 0.02, after: 0.05, delta: 0.03 });
    const data = buildChartData(delta, "26.16", "26.17", true, {
      before: [0.015, 0.024],
      after: [0.044, 0.058],
    });
    expect(data.errorSuppressed).toBe(true);
    expect(data.bars[0].error).toEqual([0, 0]);
    expect(data.bars[1].error).toEqual([0, 0]);
  });
});

// 2026-09-10 verify-impl 축B 후속 — 시안 범례에 CI 실측값 병기(`[46.3, 48.2] · [33.3, 35.2]`).
// storedCi 경로(양쪽 막대 모두 자기 패치 CI)가 실제로 쓰인 경우에만 barCi를 노출한다 — 델타-CI
// 폴백(after 막대만 CI)은 before의 "자기 CI"가 없으므로 무근거 값을 지어내지 않고 null.
describe("buildChartData — barCi(범례 CI 실측값 병기용)", () => {
  it("storedCi가 실제로 적용되면 barCi에 before/after 원본 Interval을 그대로 노출한다", () => {
    const delta = makeDelta({ metric: "banRate", before: 0.472, after: 0.342, delta: -0.13 });
    const data = buildChartData(delta, "26.16", "26.17", false, {
      before: [0.463, 0.482],
      after: [0.333, 0.352],
    });
    expect(data.barCi).toEqual({ before: [0.463, 0.482], after: [0.333, 0.352] });
  });

  it("델타-CI 폴백(storedCi 미지정)이면 barCi는 null", () => {
    const data = buildChartData(makeDelta());
    expect(data.barCi).toBeNull();
  });

  it("suppressError=true면 storedCi가 있어도 barCi는 null(오차 자체를 숨기는 상태이므로)", () => {
    const delta = makeDelta({ metric: "winRate", before: 0.625, after: 0.625, delta: 0 });
    const data = buildChartData(delta, "전", "후", true, {
      before: [0.5, 0.75],
      after: [0.5, 0.75],
    });
    expect(data.barCi).toBeNull();
  });

  it("storedCi가 한쪽만 있으면(폴백 조건) barCi는 null", () => {
    const delta = makeDelta({ metric: "pickRate" });
    const data = buildChartData(delta, "전", "후", false, { before: [0.015, 0.024], after: null });
    expect(data.barCi).toBeNull();
  });
});
