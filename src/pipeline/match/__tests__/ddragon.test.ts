import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isCompletedItem,
  loadDdragon,
  normalizeKoName,
  type DdragonItem,
} from "../ddragon";

const ITEM_FIXTURE_PATH = path.join(__dirname, "../../../__fixtures__/ddragon-item-sample.json");

const CHAMPION_FIXTURE = {
  type: "champion",
  format: "standAloneComplex",
  version: "16.17.1",
  data: {
    Aatrox: { id: "Aatrox", key: "266", name: "아트록스" },
    LeeSin: { id: "LeeSin", key: "64", name: "리 신" },
    AurelionSol: { id: "AurelionSol", key: "136", name: "아우렐리온 솔" },
  },
};

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ddragon-test-"));
  const versionDir = path.join(tmpRoot, "ddragon", "16.17.1");
  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(path.join(versionDir, "champion.json"), JSON.stringify(CHAMPION_FIXTURE));
  fs.copyFileSync(ITEM_FIXTURE_PATH, path.join(versionDir, "item.json"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("normalizeKoName", () => {
  it("공백을 제거한다", () => {
    expect(normalizeKoName("아우렐리온 솔")).toBe("아우렐리온솔");
  });

  it("중점(·/ㆍ/・)을 제거한다", () => {
    expect(normalizeKoName("가·나ㆍ다・라")).toBe("가나다라");
  });

  it("이미 정규화된 문자열은 그대로 둔다", () => {
    expect(normalizeKoName("아트록스")).toBe("아트록스");
  });
});

describe("isCompletedItem", () => {
  it("into가 없고 purchasable+total>=1600이면 완성템", () => {
    const item: Pick<DdragonItem, "into" | "gold" | "tags"> = {
      into: [],
      gold: { base: 700, purchasable: true, total: 3200, sell: 2240 },
      tags: ["Damage"],
    };
    expect(isCompletedItem(item)).toBe(true);
  });

  it("into가 있으면(업그레이드 대상) 완성템이 아니다", () => {
    const item: Pick<DdragonItem, "into" | "gold" | "tags"> = {
      into: [3095],
      gold: { base: 400, purchasable: true, total: 1600, sell: 1120 },
      tags: ["CriticalStrike"],
    };
    expect(isCompletedItem(item)).toBe(false);
  });

  it("total이 1600 미만이면 완성템이 아니다", () => {
    const item: Pick<DdragonItem, "into" | "gold" | "tags"> = {
      into: [],
      gold: { base: 400, purchasable: true, total: 1599, sell: 1120 },
      tags: [],
    };
    expect(isCompletedItem(item)).toBe(false);
  });

  it("Boots 태그는 총 가격이 1600 이상이어도 제외한다", () => {
    const item: Pick<DdragonItem, "into" | "gold" | "tags"> = {
      into: [],
      gold: { base: 1100, purchasable: true, total: 1700, sell: 1190 },
      tags: ["Boots", "AttackSpeed"],
    };
    expect(isCompletedItem(item)).toBe(false);
  });

  it("Consumable/Trinket 태그도 제외한다", () => {
    const consumable: Pick<DdragonItem, "into" | "gold" | "tags"> = {
      into: [],
      gold: { base: 50, purchasable: true, total: 5000, sell: 0 },
      tags: ["Consumable"],
    };
    const trinket: Pick<DdragonItem, "into" | "gold" | "tags"> = {
      into: [],
      gold: { base: 0, purchasable: true, total: 5000, sell: 0 },
      tags: ["Trinket"],
    };
    expect(isCompletedItem(consumable)).toBe(false);
    expect(isCompletedItem(trinket)).toBe(false);
  });
});

describe("loadDdragon", () => {
  it("champion.json/item.json을 읽어 byKey/byId/byKoName으로 조회할 수 있다", () => {
    const ddragon = loadDdragon("16.17.1", { dataRoot: tmpRoot });
    expect(ddragon.version).toBe("16.17.1");

    expect(ddragon.champions.byKey(266)?.id).toBe("Aatrox");
    expect(ddragon.champions.byId("LeeSin")?.name).toBe("리 신");
    expect(ddragon.champions.byKoName("아우렐리온 솔")?.id).toBe("AurelionSol");
    // 정규화(공백 제거) 후에도 찾을 수 있어야 한다.
    expect(ddragon.champions.byKoName("아우렐리온솔")?.id).toBe("AurelionSol");
    expect(ddragon.champions.byKoName("존재하지않는챔피언")).toBeUndefined();
  });

  it("items.byId로 단일 조회, isCompleted로 완성템 판정", () => {
    const ddragon = loadDdragon("16.17.1", { dataRoot: tmpRoot });
    expect(ddragon.items.byId(3095)?.name).toBe("폭풍갈퀴");
    expect(ddragon.items.isCompleted(3095)).toBe(true);
    expect(ddragon.items.isCompleted(1018)).toBe(false); // into가 있음(구인수의 격노검)
    expect(ddragon.items.isCompleted(3006)).toBe(false); // Boots 태그
    expect(ddragon.items.isCompleted(999999)).toBe(false); // 존재하지 않는 id
  });

  it("items.byKoName은 게임 모드 간 이름 충돌 시 후보 배열(itemId 오름차순)을 반환한다", () => {
    const ddragon = loadDdragon("16.17.1", { dataRoot: tmpRoot });
    const candidates = ddragon.items.byKoName("폭풍갈퀴");
    expect(candidates.map((c) => c.id)).toEqual([3095, 223095]);
  });

  it("items.byKoName은 이름 충돌이 없으면 배열 1개짜리를 반환한다", () => {
    const ddragon = loadDdragon("16.17.1", { dataRoot: tmpRoot });
    const candidates = ddragon.items.byKoName("갈라진 하늘");
    expect(candidates.map((c) => c.id)).toEqual([6610]);
  });

  it("items.byKoName은 매칭 없으면 빈 배열을 반환한다(에러 아님)", () => {
    const ddragon = loadDdragon("16.17.1", { dataRoot: tmpRoot });
    expect(ddragon.items.byKoName("존재하지않는아이템")).toEqual([]);
  });

  it("version 생략 시 로컬에 다운로드된 버전 중 최신(semver 내림차순)을 고른다", () => {
    // 16.17.1보다 낮은 버전 디렉토리를 하나 더 만들어 최신 선택 로직을 검증한다.
    const olderDir = path.join(tmpRoot, "ddragon", "16.9.1");
    fs.mkdirSync(olderDir, { recursive: true });
    fs.writeFileSync(path.join(olderDir, "champion.json"), JSON.stringify(CHAMPION_FIXTURE));
    fs.copyFileSync(ITEM_FIXTURE_PATH, path.join(olderDir, "item.json"));

    const ddragon = loadDdragon(undefined, { dataRoot: tmpRoot });
    expect(ddragon.version).toBe("16.17.1");
  });

  it("데이터가 없으면 run-ddragon.ts 실행을 안내하는 에러를 던진다", () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ddragon-empty-"));
    try {
      expect(() => loadDdragon(undefined, { dataRoot: emptyRoot })).toThrow(/run-ddragon/);
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });
});
