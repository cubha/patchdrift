import { describe, it, expect } from "vitest";
import type { DdragonChampion, DdragonData, DdragonItem } from "../ddragon";
import { matchDeterministic } from "../entity-match";
import type { DeltaRecord, PatchNoteItem } from "../../types";

// 디스크 I/O 없이 매핑 인덱스만 필요한 최소 DdragonData — loadDdragon() 없이 직접 구성한다
// (entity-match.ts는 이미 로드된 객체를 주입받는 순수 함수라 이렇게 테스트하는 게 정직하다).
function makeDdragon(): DdragonData {
  const champions: Record<string, DdragonChampion> = {
    Aatrox: { id: "Aatrox", key: 266, name: "아트록스" },
    Graves: { id: "Graves", key: 104, name: "그레이브즈" },
  };
  const itemsByKoName: Record<string, DdragonItem[]> = {
    폭풍갈퀴: [
      { id: 3095, name: "폭풍갈퀴", into: [], from: [], gold: { base: 700, purchasable: true, total: 3200, sell: 2240 }, tags: [] },
    ],
  };

  return {
    version: "test",
    champions: {
      byKey: (id) => Object.values(champions).find((c) => c.key === id),
      byId: (id) => champions[id],
      byKoName: (name) => Object.values(champions).find((c) => c.name === name),
    },
    items: {
      byId: () => undefined,
      byKoName: (name) => itemsByKoName[name] ?? [],
      isCompleted: () => true,
    },
  };
}

function note(overrides: Partial<PatchNoteItem>): PatchNoteItem {
  return {
    id: "note:26.17:champion:aatrox:00000001",
    patch: "26.17",
    section: "champion",
    entity: "아트록스",
    skill: "Q",
    stat: "피해량",
    before: "10",
    after: "20",
    direction: "buff",
    summary: "피해량: 10 ⇒ 20",
    anchorUrl: "https://example.com/#patch-aatrox",
    anchorKind: "entity",
    ...overrides,
  };
}

function delta(overrides: Partial<DeltaRecord>): DeltaRecord {
  return {
    id: "champion:Aatrox:winRate",
    entityType: "champion",
    entityKey: "Aatrox",
    entityName: "아트록스",
    metric: "winRate",
    before: 0.5,
    after: 0.55,
    delta: 0.05,
    ci: [0.01, 0.09],
    n: { before: 300, after: 300 },
    q: 0.01,
    status: "no-change",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "x", noteAnchor: null },
    ...overrides,
  };
}

describe("matchDeterministic", () => {
  it("같은 챔피언(entityKey)이면 노트를 델타에 블로킹한다", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1" })];
    const deltas = [delta({ id: "champion:Aatrox:winRate", entityKey: "Aatrox" })];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.get("champion:Aatrox:winRate")?.noteIds).toEqual(["n1"]);
  });

  it("매핑되지 않는 엔티티명은 mappingFailures에 담긴다", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1", entity: "존재하지않는챔피언" })];
    const deltas: DeltaRecord[] = [];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.mappingFailures).toEqual(["존재하지않는챔피언"]);
    expect(result.matches.size).toBe(0);
  });

  it("같은 엔티티의 노트가 여럿이면 하나의 묶음(noteIds 배열)으로 본다", () => {
    const ddragon = makeDdragon();
    const notes = [
      note({ id: "n1", skill: "Q" }),
      note({ id: "n2", skill: "W" }),
      note({ id: "n3", skill: "E" }),
    ];
    const deltas = [delta({ id: "champion:Aatrox:pickRate", entityKey: "Aatrox" })];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.get("champion:Aatrox:pickRate")?.noteIds).toEqual(["n1", "n2", "n3"]);
  });

  it("노트 방향 다수결(buff 2 vs nerf 1)이 buff면 관측 상승과 일치 시 consistent", () => {
    const ddragon = makeDdragon();
    const notes = [
      note({ id: "n1", direction: "buff" }),
      note({ id: "n2", direction: "buff" }),
      note({ id: "n3", direction: "nerf" }),
    ];
    const deltas = [delta({ id: "champion:Aatrox:winRate", entityKey: "Aatrox", delta: 0.05 })];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.get("champion:Aatrox:winRate")?.directionAgreement).toBe("consistent");
  });

  it("노트가 nerf인데 관측이 상승이면 inconsistent", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1", direction: "nerf" })];
    const deltas = [delta({ id: "champion:Aatrox:winRate", entityKey: "Aatrox", delta: 0.05 })];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.get("champion:Aatrox:winRate")?.directionAgreement).toBe("inconsistent");
  });

  it("노트 방향이 동률(buff 1, nerf 1)이면 neutral", () => {
    const ddragon = makeDdragon();
    const notes = [
      note({ id: "n1", direction: "buff" }),
      note({ id: "n2", direction: "nerf" }),
    ];
    const deltas = [delta({ id: "champion:Aatrox:winRate", entityKey: "Aatrox", delta: 0.05 })];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.get("champion:Aatrox:winRate")?.directionAgreement).toBe("neutral");
  });

  it("adjust/unknown 노트만 있으면 다수결에서 기권 처리되어 neutral", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1", direction: "adjust" }), note({ id: "n2", direction: "unknown" })];
    const deltas = [delta({ id: "champion:Aatrox:winRate", entityKey: "Aatrox", delta: 0.05 })];

    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.get("champion:Aatrox:winRate")?.directionAgreement).toBe("neutral");
  });

  it("아이템은 entityType=item으로 블로킹된다", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1", section: "item", entity: "폭풍갈퀴", direction: "nerf" })];
    const deltas = [
      delta({
        id: "item:3095:adoptionRate",
        entityType: "item",
        entityKey: "3095",
        entityName: "폭풍갈퀴",
        metric: "adoptionRate",
        delta: -0.02,
      }),
    ];

    const result = matchDeterministic(notes, deltas, ddragon);
    const match = result.matches.get("item:3095:adoptionRate");
    expect(match?.noteIds).toEqual(["n1"]);
    expect(match?.directionAgreement).toBe("consistent"); // nerf 노트 + 하락 관측 = 일치
  });

  it("lane/objective/summary 엔티티는 애초에 매칭 대상이 아니다", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1" })];
    const deltas = [
      delta({
        id: "lane:TOP:goldAt10",
        entityType: "lane",
        entityKey: "TOP",
        entityName: "탑",
        metric: "goldAt10",
      }),
    ];
    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.size).toBe(0);
  });

  it("system/other 섹션 노트는 애초에 블로킹 후보에서 제외된다", () => {
    const ddragon = makeDdragon();
    const notes = [note({ id: "n1", section: "system", entity: "아트록스" })];
    const deltas = [delta({ id: "champion:Aatrox:winRate", entityKey: "Aatrox" })];
    const result = matchDeterministic(notes, deltas, ddragon);
    expect(result.matches.size).toBe(0);
  });
});
