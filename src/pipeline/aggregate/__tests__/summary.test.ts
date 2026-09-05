// src/pipeline/aggregate/__tests__/summary.test.ts
import { describe, expect, it } from "vitest";
import { summarizePatch } from "../summary";
import { makeMatch, makeStandardParticipants, makeTimeline } from "./fixtures";

describe("summarizePatch", () => {
  it("매치 수·평균 경기시간(초·sd)·큐 분포·수집 시각 범위를 계산한다", () => {
    const matches = [
      makeMatch({ matchId: "M1", gameDurationSec: 1500, queueId: 420, gameCreationMs: 1000 }),
      makeMatch({ matchId: "M2", gameDurationSec: 1900, queueId: 420, gameCreationMs: 3000 }),
      makeMatch({ matchId: "M3", gameDurationSec: 2100, queueId: 440, gameCreationMs: 2000 }),
    ];
    const summary = summarizePatch(matches, [], "26.17");

    expect(summary.matches).toBe(3);
    expect(summary.avgDurationSec).toBeCloseTo((1500 + 1900 + 2100) / 3, 10);
    expect(summary.avgDurationSecSd).toBeGreaterThan(0);
    expect(summary.queueDistribution).toEqual({ 420: 2, 440: 1 });
    expect(summary.gameCreationMsRange).toEqual({ min: 1000, max: 3000 });
    expect(summary.timelineSamples).toBe(0);
  });

  it("타임라인 표본으로 첫 오브젝트 평균을 계산한다(null 제외)", () => {
    const matches = [makeMatch({ matchId: "M1" })];
    const timelines = [
      makeTimeline({ matchId: "M1", firstObjectives: { dragonSec: 300, heraldSec: null, baronSec: null, towerSec: null } }),
    ];
    const summary = summarizePatch(matches, timelines, "26.17");
    expect(summary.firstDragonSecAvg).toBeCloseTo(300, 10);
    expect(summary.firstHeraldSecAvg).toBeNull();
    expect(summary.timelineSamples).toBe(1);
  });

  it("매치가 0건이면 avgDurationSec=0(sd=0)·gameCreationMsRange=null을 반환한다", () => {
    const summary = summarizePatch([], [], "26.17");
    expect(summary.matches).toBe(0);
    expect(summary.avgDurationSec).toBe(0);
    expect(summary.avgDurationSecSd).toBe(0);
    expect(summary.gameCreationMsRange).toBeNull();
    expect(summary.queueDistribution).toEqual({});
  });

  it("makeStandardParticipants로 만든 매치도 정상적으로 소비한다(회귀 방지)", () => {
    const match = makeMatch({ matchId: "M1", participants: makeStandardParticipants() });
    const summary = summarizePatch([match], [], "26.17");
    expect(summary.matches).toBe(1);
  });
});
