// src/components/home/__tests__/streamVerdict.test.ts
// 스트림 판정 문장(streamVerdict.ts) 단위 테스트 — 시안 .rn-obs / .verdict .m 신설분.

import { describe, expect, it } from "vitest";
import type { DeltaRecord, PatchNoteItem } from "@/pipeline/types";
import { buildNoteVerdict, formatQ, selectEntityObservation } from "../streamVerdict";

function delta(overrides: Partial<DeltaRecord>): DeltaRecord {
  return {
    id: "champion:X:banRate",
    entityType: "champion",
    entityKey: "X",
    entityName: "테스트챔프",
    metric: "banRate",
    before: 0.268,
    after: 0.424,
    delta: 0.157,
    ci: [0.14, 0.17],
    n: { before: 10000, after: 10000 },
    q: 0.0001,
    status: "announced-inconsistent",
    matchedNoteId: "n1",
    matchedNoteIds: ["n1"],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null },
    ...overrides,
  };
}

function note(overrides: Partial<PatchNoteItem> = {}): PatchNoteItem {
  return {
    id: "n1",
    patch: "26.17",
    section: "champion",
    entity: "테스트챔프",
    skill: "Q",
    stat: "피해량",
    before: "70",
    after: "80",
    direction: "buff",
    summary: "요약",
    anchorUrl: "https://example.com/#x",
    anchorKind: "entity",
    ...overrides,
  };
}

describe("selectEntityObservation", () => {
  it("|delta|가 가장 큰 행을 대표로 고른다", () => {
    const rows = [
      delta({ id: "a", metric: "pickRate", delta: 0.02 }),
      delta({ id: "b", metric: "banRate", delta: -0.13 }),
      delta({ id: "c", metric: "winRate", delta: 0.05 }),
    ];
    expect(selectEntityObservation(rows)?.id).toBe("b");
  });

  it("delta===null(측정 불가) 행은 대표가 되지 않는다", () => {
    const rows = [delta({ id: "a", delta: null }), delta({ id: "b", delta: 0.01 })];
    expect(selectEntityObservation(rows)?.id).toBe("b");
  });

  it("전부 측정 불가면 null", () => {
    expect(selectEntityObservation([delta({ delta: null })])).toBeNull();
  });

  it("빈 배열이면 null", () => {
    expect(selectEntityObservation([])).toBeNull();
  });
});

describe("buildNoteVerdict", () => {
  it("짝지어진 델타가 없으면 문장을 만들지 않는다(무근거 문장 금지)", () => {
    expect(buildNoteVerdict(note(), undefined)).toBeNull();
  });

  it("상향 노트 + 유의한 상승 관측 → 노트=상향 · 밴률 상승", () => {
    const v = buildNoteVerdict(note({ direction: "buff" }), delta({ delta: 0.157, q: 0.0001 }));
    expect(v).toEqual({ noteLabel: "노트=상향", observedLabel: "밴률 상승", kind: "up" });
  });

  it("하향 노트 + 유의한 하락 관측 → 노트=하향 · 픽률 하락", () => {
    const v = buildNoteVerdict(
      note({ direction: "nerf" }),
      delta({ metric: "pickRate", delta: -0.069, q: 0.0001 })
    );
    expect(v).toEqual({ noteLabel: "노트=하향", observedLabel: "픽률 하락", kind: "down" });
  });

  it("q가 유의수준을 넘으면 방향어 없이 '유의차 없음'", () => {
    const v = buildNoteVerdict(note({ direction: "nerf" }), delta({ delta: -0.088, q: 0.22 }), 0.1);
    expect(v).toEqual({ noteLabel: "노트=하향", observedLabel: "유의차 없음", kind: "none" });
  });

  it("표본 부족(insufficient-sample)은 q와 무관하게 유의차 없음으로 판정한다", () => {
    const v = buildNoteVerdict(
      note({ direction: "adjust" }),
      delta({ status: "insufficient-sample", metric: "winRate", delta: 0.04, q: 0.001 })
    );
    expect(v).toEqual({ noteLabel: "노트=조정", observedLabel: "유의차 없음", kind: "none" });
  });

  it("direction=unknown은 방향을 지어내지 않고 '변경'으로 둔다", () => {
    const v = buildNoteVerdict(note({ direction: "unknown" }), delta({ delta: 0.157, q: 0.0001 }));
    expect(v?.noteLabel).toBe("노트=변경");
  });
});

describe("formatQ", () => {
  it("0.001 미만은 부등호 표기", () => {
    expect(formatQ(0.0001)).toBe("q<0.001");
  });

  it("0.001 이상은 값 표기(뒤따르는 0 제거)", () => {
    expect(formatQ(0.14)).toBe("q=0.14");
    expect(formatQ(0.1)).toBe("q=0.1");
  });

  it("null(계산 불가)이면 표기하지 않는다", () => {
    expect(formatQ(null)).toBeNull();
  });
});
