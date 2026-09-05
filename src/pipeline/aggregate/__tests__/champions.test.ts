// src/pipeline/aggregate/__tests__/champions.test.ts
import { describe, expect, it } from "vitest";
import type { MatchSlim } from "../../types";
import { aggregateChampions } from "../champions";
import { WIN_RATE_MIN_N } from "../stats";
import { makeMatch, makeStandardParticipants } from "./fixtures";

describe("aggregateChampions", () => {
  it("픽률·승률을 포지션별(scope=position) + 합산(scope=all) 행으로 계산한다", () => {
    // match1: Ahri MIDDLE(blue, win) vs Zed MIDDLE(red, lose)
    // match2: Ahri MIDDLE(blue, lose) vs Yasuo MIDDLE(red, win)
    const match1 = makeMatch({
      matchId: "M1",
      participants: makeStandardParticipants({
        2: { championId: 103, championName: "Ahri", win: true },
        7: { championId: 238, championName: "Zed", win: false },
      }),
      blueWin: true,
    });
    const match2 = makeMatch({
      matchId: "M2",
      participants: makeStandardParticipants({
        2: { championId: 103, championName: "Ahri", win: false },
        7: { championId: 157, championName: "Yasuo", win: true },
      }),
      blueWin: false,
    });

    const rows = aggregateChampions([match1, match2], "26.17");

    const ahriMid = rows.find((r) => r.championId === 103 && r.position === "MIDDLE" && r.scope === "position");
    expect(ahriMid).toBeDefined();
    expect(ahriMid!.n).toBe(2);
    expect(ahriMid!.pickRate).toBeCloseTo(2 / 2, 10); // 두 매치 모두 MIDDLE 슬롯에 등장
    expect(ahriMid!.winRate).toBeCloseTo(0.5, 10);
    expect(ahriMid!.totalMatches).toBe(2);

    const ahriAll = rows.find((r) => r.championId === 103 && r.scope === "all");
    expect(ahriAll).toBeDefined();
    expect(ahriAll!.n).toBe(2);
    expect(ahriAll!.position).toBe("");

    // FillerChamp(championId=1)은 나머지 8슬롯 x 2매치 = 16회 등장
    const fillerAll = rows.find((r) => r.championId === 1 && r.scope === "all");
    expect(fillerAll!.n).toBe(16);
  });

  it("승률 최소 n 게이트 — n<WIN_RATE_MIN_N이면 ci.win=null, 이상이면 Wilson CI를 채운다", () => {
    const belowGateMatches = [
      makeMatch({ matchId: "B1", participants: makeStandardParticipants(), blueWin: true }),
    ];
    const belowRows = aggregateChampions(belowGateMatches, "26.17");
    const fillerAllBelow = belowRows.find((r) => r.championId === 1 && r.scope === "all")!;
    expect(fillerAllBelow.n).toBeLessThan(WIN_RATE_MIN_N);
    expect(fillerAllBelow.ci.win).toBeNull();

    // FillerChamp(championId=1)을 TOP 포지션에 WIN_RATE_MIN_N번 이상 등장시킨다.
    const atGateMatches: MatchSlim[] = [];
    for (let i = 0; i < WIN_RATE_MIN_N; i++) {
      atGateMatches.push(
        makeMatch({
          matchId: `G${i}`,
          participants: makeStandardParticipants({ 0: { championId: 999, championName: "Gate", win: i % 2 === 0 } }),
          blueWin: i % 2 === 0,
        })
      );
    }
    const atGateRows = aggregateChampions(atGateMatches, "26.17");
    const gateTop = atGateRows.find((r) => r.championId === 999 && r.position === "TOP" && r.scope === "position")!;
    expect(gateTop.n).toBe(WIN_RATE_MIN_N);
    expect(gateTop.ci.win).not.toBeNull();
  });

  it("밴은 같은 매치에서 양 팀이 중복 밴해도 1회만 카운트하고, scope='all' 행에만 값이 실린다", () => {
    const match = makeMatch({
      matchId: "M1",
      participants: makeStandardParticipants(),
      blueBans: [78],
      redBans: [78, 200], // 78은 양 팀 중복 밴
      blueWin: true,
    });
    const rows = aggregateChampions([match], "26.17");

    // 78은 픽되지 않았으므로 championName은 빈 문자열, banRate=1(1/1 매치)이어야 한다.
    const poppyAll = rows.find((r) => r.championId === 78 && r.scope === "all")!;
    expect(poppyAll.championName).toBe("");
    expect(poppyAll.n).toBe(0);
    expect(poppyAll.banRate).toBeCloseTo(1, 10);
    expect(poppyAll.ci.ban).not.toBeNull();

    const heimerAll = rows.find((r) => r.championId === 200 && r.scope === "all")!;
    expect(heimerAll.banRate).toBeCloseTo(1, 10);

    // FillerChamp(championId=1)은 픽 기록이 있으므로 scope="position" 행이 존재 — 이 행들은
    // 밴과 무관하므로 banRate/ci.ban이 반드시 null이어야 한다(중복 합산 방지 계약).
    const fillerPositionRows = rows.filter((r) => r.championId === 1 && r.scope === "position");
    expect(fillerPositionRows.length).toBeGreaterThan(0);
    for (const row of fillerPositionRows) {
      expect(row.banRate).toBeNull();
      expect(row.ci.ban).toBeNull();
    }
  });

  it("teamPosition=''(미배정)은 scope='unknown' 행으로 남고 scope='all' 합산과 분리된다", () => {
    const match = makeMatch({
      matchId: "M1",
      participants: makeStandardParticipants({ 4: { championId: 55, championName: "Katarina", teamPosition: "" } }),
      blueWin: true,
    });
    const rows = aggregateChampions([match], "26.17");

    const unassigned = rows.find((r) => r.championId === 55 && r.scope === "unknown");
    expect(unassigned).toBeDefined();
    expect(unassigned!.n).toBe(1);
    expect(unassigned!.position).toBe("");
    expect(unassigned!.banRate).toBeNull();
    expect(unassigned!.ci.ban).toBeNull();

    const all = rows.find((r) => r.championId === 55 && r.scope === "all")!;
    expect(all.n).toBe(1);
    expect(all.position).toBe("");
    // scope로 구분되므로 unassigned와 all은 서로 다른 행이다.
    expect(unassigned).not.toBe(all);

    // scope="position"(명명된 포지션)에는 이 챔피언이 없어야 한다 — UTILITY 슬롯이 ""로
    // 바뀌었으므로 명명 포지션 등장은 0건.
    expect(rows.find((r) => r.championId === 55 && r.scope === "position")).toBeUndefined();
  });

  it("정렬은 pickRate 내림차순 — 결정론(같은 입력 재실행 시 순서 동일)을 보장한다", () => {
    const match = makeMatch({ matchId: "M1", participants: makeStandardParticipants(), blueWin: true });
    const rowsA = aggregateChampions([match], "26.17");
    const rowsB = aggregateChampions([match], "26.17");
    expect(rowsA.map((r) => `${r.championId}:${r.position}:${r.scope}`)).toEqual(
      rowsB.map((r) => `${r.championId}:${r.position}:${r.scope}`)
    );
    for (let i = 1; i < rowsA.length; i++) {
      expect(rowsA[i - 1].pickRate).toBeGreaterThanOrEqual(rowsA[i].pickRate);
    }
  });

  it("빈 배열 입력 시 빈 결과를 반환한다", () => {
    expect(aggregateChampions([], "26.17")).toEqual([]);
  });
});
