// src/pipeline/aggregate/__tests__/items.test.ts
import { describe, expect, it } from "vitest";
import type { ParticipantSlim } from "../../types";
import { aggregateItems } from "../items";
import { makeMatch, makeParticipant } from "./fixtures";

function tenParticipants(itemsBySlot: Record<number, number[]>): ParticipantSlim[] {
  const arr: ParticipantSlim[] = [];
  for (let i = 0; i < 10; i++) {
    arr.push(
      makeParticipant({
        puuid: `p${i}`,
        championId: i,
        championName: `Champ${i}`,
        teamId: i < 5 ? 100 : 200,
        teamPosition: "",
        win: i < 5,
        items: itemsBySlot[i] ?? [0, 0, 0, 0, 0, 0, 0],
      })
    );
  }
  return arr;
}

describe("aggregateItems", () => {
  it("완성템 6슬롯(item0..5)만 집계하고 장신구(item6)·빈 슬롯(0)은 제외한다", () => {
    const match = makeMatch({
      matchId: "M1",
      participants: tenParticipants({
        0: [3078, 0, 0, 0, 0, 0, 3364], // 3364는 item6(장신구) — 제외
      }),
    });
    const rows = aggregateItems([match], "26.17");

    const trinity = rows.find((r) => r.itemId === 3078);
    expect(trinity).toBeDefined();
    expect(trinity!.n).toBe(1);
    expect(trinity!.totalParticipants).toBe(10);
    expect(trinity!.adoptionRate).toBeCloseTo(0.1, 10);

    expect(rows.find((r) => r.itemId === 3364)).toBeUndefined();
    expect(rows.find((r) => r.itemId === 0)).toBeUndefined();
  });

  it("한 참가자가 같은 아이템을 여러 슬롯에 들어도 참가자 단위로 1회만 카운트한다", () => {
    const match = makeMatch({
      matchId: "M1",
      participants: tenParticipants({
        0: [1001, 1001, 0, 0, 0, 0, 0],
      }),
    });
    const rows = aggregateItems([match], "26.17");
    const boots = rows.find((r) => r.itemId === 1001)!;
    expect(boots.n).toBe(1);
  });

  it("여러 매치에 걸쳐 채택률을 누적하고 adoptionRate 내림차순으로 정렬한다", () => {
    const matchA = makeMatch({ matchId: "A", participants: tenParticipants({ 0: [6672, 0, 0, 0, 0, 0, 0] }) });
    const matchB = makeMatch({
      matchId: "B",
      participants: tenParticipants({ 0: [6672, 0, 0, 0, 0, 0, 0], 1: [6672, 0, 0, 0, 0, 0, 0] }),
    });
    const rows = aggregateItems([matchA, matchB], "26.17");
    const item = rows.find((r) => r.itemId === 6672)!;
    expect(item.n).toBe(3); // matchA 1명 + matchB 2명
    expect(item.totalParticipants).toBe(20);
    expect(item.adoptionRate).toBeCloseTo(3 / 20, 10);

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].adoptionRate).toBeGreaterThanOrEqual(rows[i].adoptionRate);
    }
  });

  it("빈 배열 입력 시 빈 결과를 반환한다", () => {
    expect(aggregateItems([], "26.17")).toEqual([]);
  });
});
