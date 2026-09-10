// src/lib/__tests__/lane.test.ts
// parseLaneAxis(lane.ts) 단위 테스트 — 델타 id에서 라인 축(TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY/all)을
// 파싱하는 순수 함수. team-dev ST-C 프롬프트 최소 케이스: 5개 라인 각각 파싱 / all-scope(라인
// 없음) 파싱 / 잘못된 형식 id에 대한 null 처리.

import { describe, expect, it } from "vitest";
import { parseLaneAxis } from "../lane";

describe("parseLaneAxis", () => {
  it("파싱: 5개 명명 포지션(scope=position, 4세그먼트) 각각", () => {
    expect(parseLaneAxis("champion:Ahri:TOP:pickRate")).toBe("TOP");
    expect(parseLaneAxis("champion:Ahri:JUNGLE:pickRate")).toBe("JUNGLE");
    expect(parseLaneAxis("champion:Ahri:MIDDLE:pickRate")).toBe("MIDDLE");
    expect(parseLaneAxis("champion:Ahri:BOTTOM:winRate")).toBe("BOTTOM");
    expect(parseLaneAxis("champion:Ahri:UTILITY:winRate")).toBe("UTILITY");
  });

  it("파싱: scope=all(3세그먼트)은 'all'", () => {
    expect(parseLaneAxis("champion:Ahri:pickRate")).toBe("all");
    expect(parseLaneAxis("champion:Ahri:banRate")).toBe("all");
    expect(parseLaneAxis("champion:Ahri:winRate")).toBe("all");
  });

  it("null: champion이 아닌 entityType", () => {
    expect(parseLaneAxis("item:1001:adoptionRate")).toBeNull();
    expect(parseLaneAxis("lane:TOP:goldAt10")).toBeNull();
    expect(parseLaneAxis("objective:dragon")).toBeNull();
    expect(parseLaneAxis("summary:avgDurationSec")).toBeNull();
  });

  it("null: 잘못된 형식 id(세그먼트 수 불일치·유효하지 않은 포지션 값)", () => {
    expect(parseLaneAxis("champion:Ahri")).toBeNull();
    expect(parseLaneAxis("champion:Ahri:FOO:pickRate")).toBeNull();
    expect(parseLaneAxis("champion:Ahri:TOP:pickRate:extra")).toBeNull();
    expect(parseLaneAxis("")).toBeNull();
  });
});
