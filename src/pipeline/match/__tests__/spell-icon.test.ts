// src/pipeline/match/__tests__/spell-icon.test.ts
// ST-D — resolveSpellIconFile 순수 매핑 함수 테스트. 파일명은 챔피언마다 임의 문자열이라
// 규칙화 불가하므로, 실제 DDragon 상세 JSON 구조를 축약한 픽스처로 Q/W/E/R/P 인덱스 매핑을
// 검증한다.
import { describe, it, expect } from "vitest";
import chogathFixture from "../../../__fixtures__/ddragon-champion-chogath.json";
import gravesFixture from "../../../__fixtures__/ddragon-champion-graves.json";
import { resolveSpellIconFile } from "../spell-icon";

describe("resolveSpellIconFile", () => {
  it("초가스 E는 VorpalSpikes.png", () => {
    expect(resolveSpellIconFile(chogathFixture, "E")).toBe("VorpalSpikes.png");
  });

  it("그레이브즈 Q는 GravesQLineSpell.png", () => {
    expect(resolveSpellIconFile(gravesFixture, "Q")).toBe("GravesQLineSpell.png");
  });

  it("초가스 P(패시브)는 Chogath_Passive.png", () => {
    expect(resolveSpellIconFile(chogathFixture, "P")).toBe("Chogath_Passive.png");
  });

  it("그레이브즈 R은 GravesCollateralDamage.png", () => {
    expect(resolveSpellIconFile(gravesFixture, "R")).toBe("GravesCollateralDamage.png");
  });

  it("spells 배열 범위를 벗어나는 슬롯은 null", () => {
    const truncated = {
      data: {
        Test: {
          spells: [{ image: { full: "OnlyQ.png" } }],
          passive: { image: { full: "Passive.png" } },
        },
      },
    };
    expect(resolveSpellIconFile(truncated, "R")).toBeNull();
  });

  it("구조가 깨진 JSON(data 없음)은 null(throw 아님)", () => {
    expect(resolveSpellIconFile({ foo: "bar" }, "Q")).toBeNull();
  });

  it("구조가 깨진 JSON(spells가 배열이 아님)은 null(throw 아님)", () => {
    const malformed = { data: { X: { spells: "not-an-array", passive: null } } };
    expect(resolveSpellIconFile(malformed, "Q")).toBeNull();
  });

  it("null 입력은 null", () => {
    expect(resolveSpellIconFile(null, "Q")).toBeNull();
  });
});
