// src/pipeline/aggregate/__tests__/lanes.test.ts
import { describe, expect, it } from "vitest";
import { aggregateLanes } from "../lanes";
import { laneSplit, makeTimeline } from "./fixtures";

describe("aggregateLanes", () => {
  it("포지션별 goldAt10/goldAt14를 팀 구분 없이 참가자 단위로 평균낸다", () => {
    const timelines = [
      makeTimeline({
        matchId: "T1",
        lanes: { TOP: laneSplit({ goldAt10: 3000, goldAt14: 5000 }, { goldAt10: 3200, goldAt14: 5400 }) },
      }),
      makeTimeline({
        matchId: "T2",
        lanes: { TOP: laneSplit({ goldAt10: 3400, goldAt14: 5600 }, { goldAt10: 3000, goldAt14: 5000 }) },
      }),
    ];
    const rows = aggregateLanes(timelines, "26.17");
    const top = rows.find((r) => r.position === "TOP")!;
    expect(top.n).toBe(4);
    expect(top.goldAt10Avg).toBeCloseTo((3000 + 3200 + 3400 + 3000) / 4, 10);
    expect(top.goldAt14Avg).toBeCloseTo((5000 + 5400 + 5600 + 5000) / 4, 10);
    expect(top.n14).toBe(4);
  });

  it("값이 없는(null) 항목은 평균 계산에서 제외한다", () => {
    const timelines = [
      makeTimeline({
        matchId: "T1",
        // blue만 goldAt14가 존재, red는 null(경기 종료로 미도달)
        lanes: { JUNGLE: laneSplit({ goldAt10: 2500, goldAt14: 4200 }, { goldAt10: 2600, goldAt14: null }) },
      }),
    ];
    const rows = aggregateLanes(timelines, "26.17");
    const jungle = rows.find((r) => r.position === "JUNGLE")!;
    expect(jungle.n).toBe(2); // goldAt10은 둘 다 존재
    expect(jungle.n14).toBe(1); // goldAt14는 blue만 존재
    expect(jungle.goldAt14Avg).toBeCloseTo(4200, 10);
  });

  it("표본이 전혀 없는 포지션은 행을 생략한다(가짜 0 값 방지)", () => {
    const timelines = [makeTimeline({ matchId: "T1", lanes: { TOP: laneSplit({ goldAt10: 3000 }, {}) } })];
    const rows = aggregateLanes(timelines, "26.17");
    expect(rows.map((r) => r.position)).toEqual(["TOP"]);
    expect(rows.find((r) => r.position === "JUNGLE")).toBeUndefined();
  });

  it("빈 배열 입력 시 빈 결과를 반환한다", () => {
    expect(aggregateLanes([], "26.17")).toEqual([]);
  });

  it("포지션 순서(TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY)로 결정론적으로 정렬된다", () => {
    const timelines = [
      makeTimeline({
        matchId: "T1",
        lanes: {
          UTILITY: laneSplit({ goldAt10: 2000 }, { goldAt10: 2100 }),
          TOP: laneSplit({ goldAt10: 3000 }, { goldAt10: 3100 }),
        },
      }),
    ];
    const rows = aggregateLanes(timelines, "26.17");
    expect(rows.map((r) => r.position)).toEqual(["TOP", "UTILITY"]);
  });
});
