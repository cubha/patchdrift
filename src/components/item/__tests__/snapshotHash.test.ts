import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { snapshotHash } from "../snapshotHash";

describe("snapshotHash", () => {
  it("sha256 hex 다이제스트의 앞 12자를 반환한다", () => {
    const raw = '{"meta":{"from":"26.16","to":"26.17"}}';
    const expected = createHash("sha256").update(raw, "utf-8").digest("hex").slice(0, 12);
    expect(snapshotHash(raw)).toBe(expected);
    expect(snapshotHash(raw)).toHaveLength(12);
  });

  it("입력이 다르면 다른 해시를 반환한다", () => {
    expect(snapshotHash("a")).not.toBe(snapshotHash("b"));
  });

  it("빈 문자열도 크래시 없이 처리한다", () => {
    expect(snapshotHash("")).toHaveLength(12);
  });
});
