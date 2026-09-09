import { describe, expect, it } from "vitest";
import type { DeltaRecord } from "@/pipeline/types";
import { buildDiscordPreview } from "../discordPreview";

function makeDelta(overrides: Partial<DeltaRecord> = {}): DeltaRecord {
  return {
    id: "champion:Trundle:pickRate",
    entityType: "champion",
    entityKey: "Trundle",
    entityName: "트런들",
    metric: "pickRate",
    before: 0.021,
    after: 0.046,
    delta: 0.025,
    ci: [0.021, 0.029],
    n: { before: 10240, after: 10118 },
    q: 0.004,
    status: "unannounced",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "x", noteAnchor: null },
    ...overrides,
  };
}

describe("buildDiscordPreview", () => {
  it("미공지 델타가 없으면 예시 문구로 폴백(isExample=true)", () => {
    const preview = buildDiscordPreview({ from: "26.17", to: "26.17", rows: [], nBefore: 100, nAfter: 100 });
    expect(preview.isExample).toBe(true);
    expect(preview.fields.length).toBeGreaterThan(0);
  });

  it("rows가 null이어도 크래시 없이 예시로 폴백", () => {
    const preview = buildDiscordPreview({ from: null, to: null, rows: null, nBefore: null, nAfter: null });
    expect(preview.isExample).toBe(true);
  });

  it("미공지 델타가 있으면 q 오름차순 상위 limit개를 필드로 만든다", () => {
    const rows: DeltaRecord[] = [
      makeDelta({ id: "a", entityName: "A", q: 0.08 }),
      makeDelta({ id: "b", entityName: "B", q: 0.001 }),
      makeDelta({ id: "c", entityName: "C", status: "no-change", q: 0.0001 }),
      makeDelta({ id: "d", entityName: "D", q: 0.05 }),
    ];
    const preview = buildDiscordPreview({ from: "26.16", to: "26.17", rows, nBefore: 10240, nAfter: 10118, limit: 2 });
    expect(preview.isExample).toBe(false);
    expect(preview.fields).toHaveLength(2);
    expect(preview.fields[0].label).toContain("B");
    expect(preview.fields[1].label).toContain("D");
    expect(preview.title).toBe("patchgap · 26.16 → 26.17");
    expect(preview.footer).toBe("patchgap · 26.16→26.17 · n=10240/10118");
  });

  it("kind별로 값 포맷이 다르다(pp/sec/gold)", () => {
    const rows: DeltaRecord[] = [
      makeDelta({ id: "pp", metric: "pickRate", delta: 0.025 }),
      makeDelta({ id: "sec", metric: "firstSec", delta: -22, entityType: "objective", entityName: "용" }),
      makeDelta({ id: "gold", metric: "goldAt14", delta: 320 }),
    ];
    const preview = buildDiscordPreview({ from: "26.16", to: "26.17", rows, nBefore: 1, nAfter: 1, limit: 3 });
    const values = preview.fields.map((f) => f.value);
    expect(values).toContain("+2.5%p");
    expect(values).toContain("−22s");
    expect(values).toContain("+320");
  });
});
