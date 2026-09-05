// src/pipeline/aggregate/__tests__/objectives.test.ts
import { describe, expect, it } from "vitest";
import { aggregateObjectives } from "../objectives";
import { makeTimeline } from "./fixtures";

describe("aggregateObjectives", () => {
  it("첫 오브젝트 시각 평균을 null 제외하고 계산하며 발생 비율을 함께 낸다", () => {
    const timelines = [
      makeTimeline({ matchId: "T1", firstObjectives: { dragonSec: 300, heraldSec: 480, baronSec: null, towerSec: 600 } }),
      makeTimeline({ matchId: "T2", firstObjectives: { dragonSec: 360, heraldSec: null, baronSec: 1200, towerSec: 640 } }),
      makeTimeline({ matchId: "T3", firstObjectives: { dragonSec: null, heraldSec: null, baronSec: null, towerSec: null } }),
    ];
    const stat = aggregateObjectives(timelines, "26.17");

    expect(stat.n).toBe(3); // ObjectiveStat.n = 표본(타임라인) 전체 수
    expect(stat.firstDragonSecAvg).toBeCloseTo((300 + 360) / 2, 10);
    expect(stat.firstHeraldSecAvg).toBeCloseTo(480, 10);
    expect(stat.firstBaronSecAvg).toBeCloseTo(1200, 10);
    expect(stat.firstTowerSecAvg).toBeCloseTo((600 + 640) / 2, 10);

    expect(stat.dragon.n).toBe(2);
    expect(stat.dragon.occurrenceRate).toBeCloseTo(2 / 3, 10);
    expect(stat.herald.n).toBe(1);
    expect(stat.herald.occurrenceRate).toBeCloseTo(1 / 3, 10);
    expect(stat.baron.n).toBe(1);
    expect(stat.tower.n).toBe(2);
  });

  it("전부 null이면 mean은 null, occurrenceRate는 0이다", () => {
    const timelines = [
      makeTimeline({ matchId: "T1" }),
      makeTimeline({ matchId: "T2" }),
    ];
    const stat = aggregateObjectives(timelines, "26.17");
    expect(stat.firstDragonSecAvg).toBeNull();
    expect(stat.dragon.mean).toBeNull();
    expect(stat.dragon.occurrenceRate).toBe(0);
    expect(stat.dragon.n).toBe(0);
  });

  it("빈 배열 입력 시 n=0, 모든 평균 null을 반환한다", () => {
    const stat = aggregateObjectives([], "26.17");
    expect(stat.n).toBe(0);
    expect(stat.firstDragonSecAvg).toBeNull();
    expect(stat.firstHeraldSecAvg).toBeNull();
    expect(stat.firstBaronSecAvg).toBeNull();
    expect(stat.firstTowerSecAvg).toBeNull();
    expect(stat.dragon.occurrenceRate).toBe(0);
  });
});
