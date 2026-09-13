import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildDeltas,
  carryOverMatchIds,
  loadAggregatedPatch,
  meanDiffPValue,
  sampleMatchIdsByEntity,
} from "../delta";
import type { AggregatedPatch } from "../delta";
import type { DdragonChampion, DdragonData, DdragonItem } from "../ddragon";
import type {
  ChampionStat,
  DeltaRecord,
  ItemStat,
  LaneGoldStat,
  MatchSlim,
  ObjectiveMetricDetail,
  ObjectiveStat,
  PatchSummary,
} from "../../types";

function deltaRecord(overrides: Partial<DeltaRecord>): DeltaRecord {
  return {
    id: "champion:Aatrox:pickRate",
    entityType: "champion",
    entityKey: "Aatrox",
    entityName: "아트록스",
    metric: "pickRate",
    before: 0.1,
    after: 0.12,
    delta: 0.02,
    ci: [0.01, 0.03],
    n: { before: 10000, after: 10000 },
    q: 0.01,
    status: "unannounced",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null },
    ...overrides,
  };
}

function champAllRow(overrides: Partial<ChampionStat>): ChampionStat {
  return {
    championId: 266,
    championKey: "Aatrox",
    championName: "Aatrox",
    position: "",
    patch: "26.17",
    scope: "all",
    totalMatches: 1000,
    n: 200,
    pickRate: 0.2,
    banRate: 0.1,
    winRate: 0.5,
    ci: { pick: [0.17, 0.23], ban: [0.08, 0.12], win: [0.43, 0.57] },
    ...overrides,
  };
}

function champPosRow(overrides: Partial<ChampionStat>): ChampionStat {
  return {
    championId: 266,
    championKey: "Aatrox",
    championName: "Aatrox",
    position: "TOP",
    patch: "26.17",
    scope: "position",
    totalMatches: 1000,
    n: 150,
    pickRate: 0.15,
    banRate: null,
    winRate: 0.5,
    ci: { pick: [0.13, 0.17], ban: null, win: [0.42, 0.58] },
    ...overrides,
  };
}

function itemRow(overrides: Partial<ItemStat>): ItemStat {
  return {
    itemId: 3095,
    patch: "26.17",
    n: 500,
    totalParticipants: 10000,
    adoptionRate: 0.05,
    ci: [0.04, 0.06],
    ...overrides,
  };
}

function laneRow(overrides: Partial<LaneGoldStat>): LaneGoldStat {
  return {
    patch: "26.17",
    position: "TOP",
    n: 100,
    goldAt10Avg: 3000,
    goldAt10Sd: 200,
    goldAt14Avg: 4500,
    goldAt14Sd: 300,
    n14: 100,
    ...overrides,
  };
}

function objDetail(overrides: Partial<ObjectiveMetricDetail>): ObjectiveMetricDetail {
  return { n: 50, mean: 480, sd: 40, occurrenceRate: 0.5, ...overrides };
}

function objectiveStat(overrides: Partial<ObjectiveStat>): ObjectiveStat {
  return {
    patch: "26.17",
    n: 100,
    firstDragonSecAvg: 480,
    firstHeraldSecAvg: 480,
    firstBaronSecAvg: null,
    firstTowerSecAvg: null,
    dragon: objDetail({}),
    herald: objDetail({}),
    baron: objDetail({ mean: null, n: 0, sd: 0, occurrenceRate: 0 }),
    tower: objDetail({ mean: null, n: 0, sd: 0, occurrenceRate: 0 }),
    ...overrides,
  };
}

function summaryStat(overrides: Partial<PatchSummary>): PatchSummary {
  return {
    patch: "26.17",
    matches: 1000,
    avgDurationSec: 1500,
    avgDurationSecSd: 300,
    firstDragonSecAvg: 480,
    firstHeraldSecAvg: 480,
    firstBaronSecAvg: null,
    firstTowerSecAvg: null,
    queueDistribution: { 420: 1000 },
    gameCreationMsRange: { min: 0, max: 1 },
    timelineSamples: 100,
    ...overrides,
  };
}

function makeAggregatedPatch(patch: string, overrides: Partial<AggregatedPatch> = {}): AggregatedPatch {
  return {
    patch,
    champions: [champAllRow({ patch })],
    items: [itemRow({ patch })],
    lanes: [laneRow({ patch })],
    objectives: objectiveStat({ patch }),
    summary: summaryStat({ patch }),
    ...overrides,
  };
}

function makeDdragon(): DdragonData {
  const champions: Record<number, DdragonChampion> = {
    266: { id: "Aatrox", key: 266, name: "아트록스" },
  };
  const items: Record<number, DdragonItem> = {
    3095: {
      id: 3095,
      name: "폭풍갈퀴",
      into: [],
      from: [],
      gold: { base: 700, purchasable: true, total: 3200, sell: 2240 },
      tags: [],
    },
    1018: {
      id: 1018,
      name: "구인수의 격노검",
      into: [3095], // 완성템 아님(업그레이드 대상)
      from: [],
      gold: { base: 400, purchasable: true, total: 1600, sell: 1120 },
      tags: [],
    },
  };
  return {
    version: "test",
    champions: {
      byKey: (id) => champions[id],
      byId: (id) => Object.values(champions).find((c) => c.id === id),
      byKoName: (name) => Object.values(champions).find((c) => c.name === name),
    },
    items: {
      byId: (id) => items[id],
      byKoName: (name) => Object.values(items).filter((it) => it.name === name),
      isCompleted: (id) => {
        const item = items[id];
        return item !== undefined && item.into.length === 0 && item.gold.total >= 1600;
      },
    },
  };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delta-test-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("meanDiffPValue", () => {
  it("평균이 같으면 p=1에 가깝다", () => {
    expect(meanDiffPValue(100, 10, 50, 100, 10, 50)).toBeCloseTo(1, 5);
  });

  it("극단적으로 다르면 p가 매우 작다", () => {
    expect(meanDiffPValue(100, 5, 200, 500, 5, 200)).toBeLessThan(1e-6);
  });

  it("se=0이고 평균도 같으면 1, 다르면 0", () => {
    expect(meanDiffPValue(10, 0, 5, 10, 0, 5)).toBe(1);
    expect(meanDiffPValue(10, 0, 5, 20, 0, 5)).toBe(0);
  });

  it("실결함 회귀: n1=0(또는 n2=0)이면 NaN/Infinity 대신 비유의(p=1)로 고정한다", () => {
    expect(meanDiffPValue(100, 10, 0, 120, 10, 50)).toBe(1);
    expect(meanDiffPValue(100, 10, 50, 120, 10, 0)).toBe(1);
    expect(meanDiffPValue(100, 0, 0, 120, 0, 50)).toBe(1); // sd=0·n=0 동시(0/0) 케이스
  });
});

describe("buildDeltas — 챔피언", () => {
  it("scope=all: pickRate/banRate/winRate 델타를 계산한다", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [champAllRow({ patch: "26.16", n: 150, pickRate: 0.15, banRate: 0.05, winRate: 0.45 })],
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [champAllRow({ patch: "26.17", n: 250, pickRate: 0.25, banRate: 0.15, winRate: 0.55 })],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });

    const pick = deltas.find((d) => d.id === "champion:Aatrox:pickRate");
    const ban = deltas.find((d) => d.id === "champion:Aatrox:banRate");
    const win = deltas.find((d) => d.id === "champion:Aatrox:winRate");
    expect(pick).toBeDefined();
    expect(ban).toBeDefined();
    expect(win).toBeDefined();
    expect(pick!.delta).toBeCloseTo(0.1, 5);
    expect(ban!.delta).toBeCloseTo(0.1, 5);
    expect(win!.delta).toBeCloseTo(0.1, 5);
    expect(pick!.entityName).toBe("아트록스");
    expect(pick!.entityKey).toBe("Aatrox");
  });

  it("이전 패치에 없던(신규) 챔피언은 델타를 만들지 않는다", () => {
    const before = makeAggregatedPatch("26.16", { champions: [] });
    const after = makeAggregatedPatch("26.17", { champions: [champAllRow({ patch: "26.17" })] });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.filter((d) => d.entityType === "champion")).toHaveLength(0);
  });

  it("포지션 행이 한쪽에만 있으면 없는 쪽을 0으로 간주해 델타를 만든다", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [champAllRow({ patch: "26.16" })], // TOP 포지션 행 없음(n=0 취급)
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [champAllRow({ patch: "26.17" }), champPosRow({ patch: "26.17" })],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    const posPick = deltas.find((d) => d.id === "champion:Aatrox:TOP:pickRate");
    expect(posPick).toBeDefined();
    expect(posPick!.before).toBe(0);
    expect(posPick!.after).toBeCloseTo(0.15, 5);
  });

  it("양쪽 다 그 포지션 n=0이면 델타를 만들지 않는다", () => {
    const before = makeAggregatedPatch("26.16", { champions: [champAllRow({ patch: "26.16" })] });
    const after = makeAggregatedPatch("26.17", { champions: [champAllRow({ patch: "26.17" })] });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.find((d) => d.id.startsWith("champion:") && d.id.includes(":TOP:"))).toBeUndefined();
  });

  it("winRate는 n 게이트 미달이어도 레코드를 만든다(판정은 verdict 몫)", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [champAllRow({ patch: "26.16", n: 10, winRate: 0.4 })],
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [champAllRow({ patch: "26.17", n: 12, winRate: 0.5 })],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    const win = deltas.find((d) => d.id === "champion:Aatrox:winRate");
    expect(win).toBeDefined();
    expect(win!.n).toEqual({ before: 10, after: 12 });
  });
});

describe("buildDeltas — 아이템(완성템 필터)", () => {
  it("완성템만 adoptionRate 델타를 만든다", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [],
      items: [itemRow({ patch: "26.16", itemId: 3095, n: 400 }), itemRow({ patch: "26.16", itemId: 1018, n: 300 })],
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [],
      items: [itemRow({ patch: "26.17", itemId: 3095, n: 600 }), itemRow({ patch: "26.17", itemId: 1018, n: 500 })],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.find((d) => d.id === "item:3095:adoptionRate")).toBeDefined();
    expect(deltas.find((d) => d.id === "item:1018:adoptionRate")).toBeUndefined(); // 완성템 아님
  });
});

describe("buildDeltas — 라인 골드", () => {
  it("goldAt10은 항상, goldAt14는 n14>0일 때만 델타를 만든다", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [],
      items: [],
      lanes: [laneRow({ patch: "26.16", goldAt10Avg: 2900, goldAt14Avg: 4400, n14: 0 })],
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [],
      items: [],
      lanes: [laneRow({ patch: "26.17", goldAt10Avg: 3100, goldAt14Avg: 4600, n14: 80 })],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.find((d) => d.id === "lane:TOP:goldAt10")).toBeDefined();
    // before.n14===0 → goldAt14 델타는 스킵(가짜 0 오염 방지)
    expect(deltas.find((d) => d.id === "lane:TOP:goldAt14")).toBeUndefined();
  });

  it("한쪽에 그 포지션 표본이 아예 없으면(행 없음) 스킵한다", () => {
    const before = makeAggregatedPatch("26.16", { champions: [], items: [], lanes: [] });
    const after = makeAggregatedPatch("26.17", { champions: [], items: [], lanes: [laneRow({ patch: "26.17" })] });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.filter((d) => d.entityType === "lane")).toHaveLength(0);
  });
});

describe("buildDeltas — 오브젝트", () => {
  it("mean이 null인 오브젝트(baron/tower)는 스킵, 값 있는 것(dragon/herald)만 만든다", () => {
    const before = makeAggregatedPatch("26.16", { champions: [], items: [] });
    const after = makeAggregatedPatch("26.17", { champions: [], items: [] });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.find((d) => d.id === "objective:dragon")).toBeDefined();
    expect(deltas.find((d) => d.id === "objective:herald")).toBeDefined();
    expect(deltas.find((d) => d.id === "objective:baron")).toBeUndefined();
    expect(deltas.find((d) => d.id === "objective:tower")).toBeUndefined();
  });
});

describe("buildDeltas — 매치 평균", () => {
  it("summary:avgDurationSec 델타를 만든다", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [],
      items: [],
      summary: summaryStat({ patch: "26.16", avgDurationSec: 1450 }),
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [],
      items: [],
      summary: summaryStat({ patch: "26.17", avgDurationSec: 1550 }),
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    const summaryDelta = deltas.find((d) => d.id === "summary:avgDurationSec");
    expect(summaryDelta).toBeDefined();
    expect(summaryDelta!.delta).toBeCloseTo(100, 5);
    expect(summaryDelta!.entityType).toBe("summary");
  });

  it("matches=0인 쪽이 있으면 스킵한다", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [],
      items: [],
      summary: summaryStat({ patch: "26.16", matches: 0 }),
    });
    const after = makeAggregatedPatch("26.17", { champions: [], items: [] });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    expect(deltas.find((d) => d.id === "summary:avgDurationSec")).toBeUndefined();
  });
});

describe("buildDeltas — BH-FDR q값", () => {
  it("모든 델타의 p값에 공통으로 benjaminiHochberg를 적용한다(q가 채워짐)", () => {
    const before = makeAggregatedPatch("26.16", {
      champions: [champAllRow({ patch: "26.16", n: 100, winRate: 0.3 })],
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [champAllRow({ patch: "26.17", n: 900, winRate: 0.7 })],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    for (const d of deltas) {
      expect(d.q).not.toBeNull();
      expect(d.q!).toBeGreaterThanOrEqual(0);
      expect(d.q!).toBeLessThanOrEqual(1);
    }
  });

  it("실결함 회귀: n=0 승률 행(포지션 한쪽만 등장)이 섞여도 다른 행의 q는 유한하다 — " +
      "twoProportionPValue의 NaN이 benjaminiHochberg 정렬·누적-min을 타고 전체 q를 null로 오염시키던 결함", () => {
    const before = makeAggregatedPatch("26.16", {
      // TOP 포지션 행 없음 → beforeN=0 → winsBefore=0 → 과거엔 twoProportionPValue(0,0,...)가 NaN
      champions: [champAllRow({ patch: "26.16", n: 300, winRate: 0.5 })],
    });
    const after = makeAggregatedPatch("26.17", {
      champions: [
        champAllRow({ patch: "26.17", n: 320, winRate: 0.55 }),
        champPosRow({ patch: "26.17", position: "TOP", n: 40, winRate: 0.6 }),
      ],
    });
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });

    // n=0이 섞인 그 행 자체도 q는 유한(null 아님) — 검정은 p=1로 수행됨
    const topWin = deltas.find((d) => d.id === "champion:Aatrox:TOP:winRate");
    expect(topWin).toBeDefined();
    expect(topWin!.n.before).toBe(0);
    expect(topWin!.q).not.toBeNull();

    // 나머지(scope=all pickRate/banRate/winRate 등) 모든 행의 q도 유한 — 오염 없음
    for (const d of deltas) {
      expect(d.q).not.toBeNull();
      expect(Number.isFinite(d.q!)).toBe(true);
      expect(d.q!).toBeGreaterThanOrEqual(0);
      expect(d.q!).toBeLessThanOrEqual(1);
    }
  });
});

describe("buildDeltas — 자리표시자 필드", () => {
  it("status='no-change'·matchedNoteId=null·causes=[] 로 초기화된다(verdict가 아직 안 채움)", () => {
    const before = makeAggregatedPatch("26.16", {});
    const after = makeAggregatedPatch("26.17", {});
    const deltas = buildDeltas(before, after, { ddragon: makeDdragon(), dataRoot: tmpRoot });
    for (const d of deltas) {
      expect(d.status).toBe("no-change");
      expect(d.matchedNoteId).toBeNull();
      expect(d.matchedNoteIds).toEqual([]);
      expect(d.causes).toEqual([]);
      expect(d.evidence.noteAnchor).toBeNull();
    }
  });
});

describe("sampleMatchIdsByEntity", () => {
  function writeMatchesJsonl(dir: string, matches: MatchSlim[]): string {
    const file = path.join(dir, "matches.jsonl");
    fs.writeFileSync(file, matches.map((m) => JSON.stringify(m)).join("\n") + "\n", "utf8");
    return file;
  }

  function makeMatch(matchId: string, championIds: number[], items: number[]): MatchSlim {
    return {
      matchId,
      gameVersion: "16.17.1",
      patch: "26.17",
      gameCreationMs: 0,
      gameDurationSec: 1500,
      queueId: 420,
      participants: championIds.map((championId, i) => ({
        puuid: `p${i}`,
        championId,
        championName: "X",
        teamId: i < 5 ? 100 : 200,
        teamPosition: "TOP",
        win: true,
        kills: 0,
        deaths: 0,
        assists: 0,
        items: i === 0 ? items : [0, 0, 0, 0, 0, 0, 0],
        goldEarned: 0,
        challenges: {},
      })),
      teams: [
        { teamId: 100, win: true, bans: [], objectives: { baron: { first: false, kills: 0 }, dragon: { first: false, kills: 0 }, riftHerald: { first: false, kills: 0 }, tower: { first: false, kills: 0 } } },
        { teamId: 200, win: false, bans: [], objectives: { baron: { first: false, kills: 0 }, dragon: { first: false, kills: 0 }, riftHerald: { first: false, kills: 0 }, tower: { first: false, kills: 0 } } },
      ],
    };
  }

  it("championId/itemId별 표본 matchId를 최대 10개까지 모은다(단일 패스)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sample-match-"));
    try {
      const matches: MatchSlim[] = [];
      for (let i = 0; i < 15; i++) {
        matches.push(makeMatch(`M${i}`, [266, 104, 1, 1, 1, 1, 1, 1, 1, 1], [3095, 0, 0, 0, 0, 0, 0]));
      }
      const file = writeMatchesJsonl(dir, matches);
      const result = sampleMatchIdsByEntity(file, new Set([266]), new Set([3095]));
      expect(result.championMatchIds.get(266)).toHaveLength(10);
      expect(result.itemMatchIds.get(3095)).toHaveLength(10);
      expect(result.championMatchIds.get(266)![0]).toBe("M0");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("파일이 없으면 빈 Map을 반환한다(에러 아님)", () => {
    const result = sampleMatchIdsByEntity("/nonexistent/matches.jsonl", new Set([1]), new Set([1]));
    expect(result.championMatchIds.size).toBe(0);
    expect(result.itemMatchIds.size).toBe(0);
  });

  it("관심 없는 championId/itemId는 수집하지 않는다", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sample-match-2-"));
    try {
      const file = writeMatchesJsonl(dir, [makeMatch("M0", [266, 1, 1, 1, 1, 1, 1, 1, 1, 1], [3095, 0, 0, 0, 0, 0, 0])]);
      const result = sampleMatchIdsByEntity(file, new Set([999]), new Set([888]));
      expect(result.championMatchIds.size).toBe(0);
      expect(result.itemMatchIds.size).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadAggregatedPatch — 파일 없으면 복구 명령을 담은 에러", () => {
  it("aggregated 디렉토리가 없으면 run-aggregate 명령을 안내하며 던진다", () => {
    expect(() => loadAggregatedPatch("99.99", tmpRoot)).toThrow(/run-aggregate/);
  });
});

// ─── 실데이터 스모크: 26.17 vs 26.17(자기 자신) — delta=0·no-change 확인 ───
// (advisor 권고: data/aggregated/26.16이 아직 없어 26.16↔26.17 스모크는 불가 — 자기 자신 비교로
// "파이프라인이 실데이터에서 죽지 않고, 동일 입력에 대해 델타=0·q=1·no-change를 낸다"만 확인한다.
// 크롤러가 계속 append 중인 데이터라 fs.existsSync로 가드한다.)
describe("실데이터 스모크 — 26.17 vs 26.17 자기 자신", () => {
  const REPO_ROOT = path.resolve(__dirname, "../../../..");
  const aggregatedDir = path.join(REPO_ROOT, "data", "aggregated", "26.17");
  const ddragonBase = path.join(REPO_ROOT, "data", "ddragon");
  const hasRealData = fs.existsSync(aggregatedDir) && fs.existsSync(ddragonBase);

  it.skipIf(!hasRealData)("모든 델타가 delta=0·q=1(또는 null)·status=no-change다", async () => {
    const { loadDdragon } = await import("../ddragon");
    const patch = loadAggregatedPatch("26.17", path.join(REPO_ROOT, "data"));
    const ddragon = loadDdragon(undefined, { dataRoot: path.join(REPO_ROOT, "data") });
    const deltas = buildDeltas(patch, patch, { ddragon, dataRoot: path.join(REPO_ROOT, "data") });

    expect(deltas.length).toBeGreaterThan(0);
    for (const d of deltas) {
      expect(d.delta).toBeCloseTo(0, 6);
      expect(d.ci[0]).toBeLessThanOrEqual(0);
      expect(d.ci[1]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── carryOverMatchIds — raw 부재 시 evidence.matchIds 승계(2026-09-13, PLAN ②-4) ───
describe("carryOverMatchIds", () => {
  it("새 델타의 matchIds가 비어 있고 이전 델타에 값이 있으면 승계한다", () => {
    const fresh = [deltaRecord({ id: "a", evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null } })];
    const oldById = new Map([
      ["a", deltaRecord({ id: "a", evidence: { matchIds: ["m1", "m2"], aggregatePath: "#", noteAnchor: null } })],
    ]);
    const { deltas, carriedOverCount } = carryOverMatchIds(fresh, oldById);
    expect(deltas[0].evidence.matchIds).toEqual(["m1", "m2"]);
    expect(carriedOverCount).toBe(1);
  });

  it("새 델타에 이미 matchIds가 있으면 덮어쓰지 않는다(새 계산이 항상 우선)", () => {
    const fresh = [deltaRecord({ id: "a", evidence: { matchIds: ["fresh1"], aggregatePath: "#", noteAnchor: null } })];
    const oldById = new Map([
      ["a", deltaRecord({ id: "a", evidence: { matchIds: ["old1", "old2"], aggregatePath: "#", noteAnchor: null } })],
    ]);
    const { deltas, carriedOverCount } = carryOverMatchIds(fresh, oldById);
    expect(deltas[0].evidence.matchIds).toEqual(["fresh1"]);
    expect(carriedOverCount).toBe(0);
  });

  it("이전 파일에 같은 id가 없으면 빈 배열 그대로 둔다", () => {
    const fresh = [deltaRecord({ id: "a", evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null } })];
    const { deltas, carriedOverCount } = carryOverMatchIds(fresh, new Map());
    expect(deltas[0].evidence.matchIds).toEqual([]);
    expect(carriedOverCount).toBe(0);
  });

  it("이전 델타도 matchIds가 비어 있으면(lane/objective/summary 등 sampleKey 없는 행) 승계하지 않는다", () => {
    const fresh = [deltaRecord({ id: "lane:BOTTOM:goldAt14", evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null } })];
    const oldById = new Map([
      ["lane:BOTTOM:goldAt14", deltaRecord({ id: "lane:BOTTOM:goldAt14", evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null } })],
    ]);
    const { deltas, carriedOverCount } = carryOverMatchIds(fresh, oldById);
    expect(deltas[0].evidence.matchIds).toEqual([]);
    expect(carriedOverCount).toBe(0);
  });

  it("원본 배열을 변경하지 않는다(불변)", () => {
    const original = deltaRecord({ id: "a", evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null } });
    const fresh = [original];
    const oldById = new Map([
      ["a", deltaRecord({ id: "a", evidence: { matchIds: ["m1"], aggregatePath: "#", noteAnchor: null } })],
    ]);
    carryOverMatchIds(fresh, oldById);
    expect(original.evidence.matchIds).toEqual([]);
  });
});
