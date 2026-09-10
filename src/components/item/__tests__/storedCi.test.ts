// src/components/item/__tests__/storedCi.test.ts
import { describe, expect, it } from "vitest";
import type { ChampionStat, ItemStat } from "@/pipeline/types";
import type { DdragonData } from "@/pipeline/match/ddragon";
import { resolveStoredCi } from "../storedCi";

function stubDdragon(): DdragonData {
  return {
    version: "16.18.1",
    champions: {
      byKey: (numericId) => (numericId === 31 ? { id: "Chogath", key: 31, name: "초가스" } : undefined),
      byId: (id) => (id === "Chogath" ? { id: "Chogath", key: 31, name: "초가스" } : undefined),
      byKoName: () => undefined,
    },
    items: { byId: () => undefined, byKoName: () => [], isCompleted: () => false },
  };
}

function championRow(overrides: Partial<ChampionStat>): ChampionStat {
  return {
    championId: 31,
    championKey: "Chogath",
    championName: "초가스",
    position: "",
    patch: "26.17",
    scope: "all",
    totalMatches: 1000,
    n: 100,
    pickRate: 0.1,
    banRate: 0.05,
    winRate: 0.5,
    ci: { pick: [0.09, 0.11], ban: [0.04, 0.06], win: [0.45, 0.55] },
    ...overrides,
  };
}

function itemRow(overrides: Partial<ItemStat>): ItemStat {
  return {
    itemId: 3153,
    patch: "26.17",
    n: 200,
    totalParticipants: 10000,
    adoptionRate: 0.02,
    ci: [0.015, 0.025],
    ...overrides,
  };
}

describe("resolveStoredCi", () => {
  it("champion scope=all pickRate — before/after ci.pick을 반환한다", () => {
    const before = [championRow({ patch: "26.16", ci: { pick: [0.08, 0.1], ban: null, win: null } })];
    const after = [championRow({ patch: "26.17" })];
    const result = resolveStoredCi(
      { id: "champion:Chogath:pickRate", entityType: "champion", entityKey: "Chogath", metric: "pickRate" },
      stubDdragon(),
      before,
      after,
      null,
      null
    );
    expect(result).toEqual({ before: [0.08, 0.1], after: [0.09, 0.11] });
  });

  it("champion scope=position(4세그먼트 id) — position 필드로 매칭한다", () => {
    const before = [championRow({ scope: "position", position: "TOP", ci: { pick: [0.03, 0.05], ban: null, win: [0.4, 0.6] } })];
    const after = [championRow({ scope: "position", position: "TOP", ci: { pick: [0.04, 0.06], ban: null, win: [0.42, 0.62] } })];
    const result = resolveStoredCi(
      { id: "champion:Chogath:TOP:winRate", entityType: "champion", entityKey: "Chogath", metric: "winRate" },
      stubDdragon(),
      before,
      after,
      null,
      null
    );
    expect(result).toEqual({ before: [0.4, 0.6], after: [0.42, 0.62] });
  });

  it("banRate는 scope=position 행에서 항상 ci.ban=null이라 결과도 null", () => {
    const after = [championRow({ scope: "position", position: "TOP", ci: { pick: [0.04, 0.06], ban: null, win: [0.4, 0.6] } })];
    const result = resolveStoredCi(
      { id: "champion:Chogath:TOP:banRate", entityType: "champion", entityKey: "Chogath", metric: "banRate" },
      stubDdragon(),
      [],
      after,
      null,
      null
    );
    expect(result).toEqual({ before: null, after: null });
  });

  it("행을 못 찾으면(신규 챔피언 등) 해당 쪽만 null", () => {
    const after = [championRow({})];
    const result = resolveStoredCi(
      { id: "champion:Chogath:pickRate", entityType: "champion", entityKey: "Chogath", metric: "pickRate" },
      stubDdragon(),
      [], // before 없음
      after,
      null,
      null
    );
    expect(result).toEqual({ before: null, after: [0.09, 0.11] });
  });

  it("ddragon 매핑 실패(byId 못 찾음)면 undefined", () => {
    const result = resolveStoredCi(
      { id: "champion:Unknown:pickRate", entityType: "champion", entityKey: "Unknown", metric: "pickRate" },
      stubDdragon(),
      [],
      [],
      null,
      null
    );
    expect(result).toBeUndefined();
  });

  it("item adoptionRate — before/after ItemStat.ci를 반환한다", () => {
    const before = [itemRow({ patch: "26.16", ci: [0.01, 0.02] })];
    const after = [itemRow({ patch: "26.17" })];
    const result = resolveStoredCi(
      { id: "item:3153:adoptionRate", entityType: "item", entityKey: "3153", metric: "adoptionRate" },
      stubDdragon(),
      null,
      null,
      before,
      after
    );
    expect(result).toEqual({ before: [0.01, 0.02], after: [0.015, 0.025] });
  });

  it("저장 CI 대상이 아닌 metric(goldAt10 등)은 undefined — 델타-CI 폴백 위임", () => {
    const result = resolveStoredCi(
      { id: "lane:BOTTOM:goldAt10", entityType: "lane", entityKey: "BOTTOM", metric: "goldAt10" },
      stubDdragon(),
      null,
      null,
      null,
      null
    );
    expect(result).toBeUndefined();
  });
});
