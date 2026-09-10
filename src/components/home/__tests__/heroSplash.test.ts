// 히어로 앰비언트 대표 챔피언 선정 — 순수 함수 단위 테스트(RED 먼저, ST-TDD).
import { describe, expect, it } from "vitest";
import type { DeltaRecord } from "@/pipeline/types";
import { resolveHeroSplashEntityKey } from "../heroSplash";

function makeRow(overrides: Partial<DeltaRecord> = {}): DeltaRecord {
  return {
    id: "champion:Trundle:pickRate",
    entityType: "champion",
    entityKey: "Trundle",
    entityName: "트런들",
    metric: "pickRate",
    before: 0.1,
    after: 0.12,
    delta: 0.02,
    ci: [0.01, 0.03],
    n: { before: 1000, after: 1000 },
    q: 0.001,
    status: "unannounced",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "x", noteAnchor: null },
    ...overrides,
  };
}

describe("resolveHeroSplashEntityKey", () => {
  it("scope=all 챔피언 행 중 |delta| 최댓값 1건의 entityKey를 고른다", () => {
    const rows = [
      makeRow({ id: "champion:Qiyana:banRate", entityKey: "Qiyana", delta: 0.1568 }),
      makeRow({ id: "champion:Locke:banRate", entityKey: "Locke", delta: -0.1302 }),
      makeRow({ id: "champion:Vayne:banRate", entityKey: "Vayne", delta: -0.05 }),
    ];
    expect(resolveHeroSplashEntityKey(rows)).toBe("Qiyana");
  });

  it("insufficient-sample 행은 후보에서 제외한다", () => {
    const rows = [
      makeRow({
        id: "champion:Smolder:winRate",
        entityKey: "Smolder",
        delta: 0.9,
        status: "insufficient-sample",
      }),
      makeRow({ id: "champion:Qiyana:banRate", entityKey: "Qiyana", delta: 0.1568 }),
    ];
    expect(resolveHeroSplashEntityKey(rows)).toBe("Qiyana");
  });

  it("position-scope(4세그먼트) 행은 후보에서 제외한다(챔피언 scope=all만)", () => {
    const rows = [
      makeRow({ id: "champion:Qiyana:JUNGLE:winRate", entityKey: "Qiyana", delta: 0.9 }),
      makeRow({ id: "champion:Locke:banRate", entityKey: "Locke", delta: -0.13 }),
    ];
    expect(resolveHeroSplashEntityKey(rows)).toBe("Locke");
  });

  it("champion이 아닌 entityType 행은 후보에서 제외한다", () => {
    const rows = [
      makeRow({ id: "lane:BOTTOM:goldAt14", entityType: "lane", entityKey: "BOTTOM", delta: 500 }),
      makeRow({ id: "champion:Locke:banRate", entityKey: "Locke", delta: -0.13 }),
    ];
    expect(resolveHeroSplashEntityKey(rows)).toBe("Locke");
  });

  it("delta가 null인 행은 후보에서 제외한다", () => {
    const rows = [
      makeRow({ id: "champion:Amumu:winRate", entityKey: "Amumu", delta: null, before: null, after: null }),
      makeRow({ id: "champion:Locke:banRate", entityKey: "Locke", delta: -0.13 }),
    ];
    expect(resolveHeroSplashEntityKey(rows)).toBe("Locke");
  });

  it("후보가 없으면 null", () => {
    expect(resolveHeroSplashEntityKey([])).toBeNull();
  });
});
