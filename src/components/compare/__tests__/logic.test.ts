// src/components/compare/__tests__/logic.test.ts
// 대조표 순수 로직(logic.ts) 단위 테스트 — 상태 필터·헤더 정렬·좌 내비 검색/섹션 필터·대표
// 상태 산출·테이블 셀 포맷·커버리지 집계. ST-11 완료 조건("상태 필터·정렬 로직(순수 함수)").

import { describe, expect, it } from "vitest";
import type { DeltaRecord, PatchNoteItem } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";
import {
  computeCoverage,
  directionSymbol,
  filterByStatus,
  filterNotesBySearch,
  filterNotesBySection,
  formatCiCell,
  formatDeltaCell,
  formatNCell,
  representativeStatus,
  shortNoteId,
  sortRows,
} from "../logic";

function delta(overrides: Partial<DeltaRecord>): DeltaRecord {
  return {
    id: "champion:X:pickRate",
    entityType: "champion",
    entityKey: "X",
    entityName: "테스트챔프",
    metric: "pickRate",
    before: 0.1,
    after: 0.12,
    delta: 0.02,
    ci: [0.01, 0.03],
    n: { before: 1000, after: 1200 },
    q: 0.02,
    status: "unannounced",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null },
    ...overrides,
  };
}

function note(overrides: Partial<PatchNoteItem>): PatchNoteItem {
  return {
    id: "note:1",
    patch: "26.17",
    section: "champion",
    entity: "테스트챔프",
    skill: null,
    stat: null,
    before: null,
    after: null,
    direction: "unknown",
    summary: "테스트 요약",
    anchorUrl: "https://example.com/#x",
    anchorKind: "entity",
    ...overrides,
  };
}

function notesFile(items: PatchNoteItem[]): NotesFile {
  return {
    meta: { patch: "26.17", sourceUrl: "https://example.com", fetchedAt: "2026-09-05T00:00:00.000Z", itemCount: items.length },
    summary: "요약",
    sections: [],
    items,
  };
}

describe("filterByStatus", () => {
  const rows = [
    delta({ id: "1", status: "unannounced" }),
    delta({ id: "2", status: "announced-consistent" }),
    delta({ id: "3", status: "no-change" }),
  ];

  it("all은 전체(그대로 반환, no-change 포함)", () => {
    expect(filterByStatus(rows, "all")).toHaveLength(3);
  });

  it("특정 상태만 남긴다", () => {
    expect(filterByStatus(rows, "unannounced").map((r) => r.id)).toEqual(["1"]);
  });
});

describe("sortRows", () => {
  it("absDelta desc가 기본", () => {
    const rows = [delta({ id: "small", delta: 0.01 }), delta({ id: "big", delta: -0.09 })];
    expect(sortRows(rows, "absDelta", "desc").map((r) => r.id)).toEqual(["big", "small"]);
  });

  it("asc 방향 전환", () => {
    const rows = [delta({ id: "small", delta: 0.01 }), delta({ id: "big", delta: -0.09 })];
    expect(sortRows(rows, "absDelta", "asc").map((r) => r.id)).toEqual(["small", "big"]);
  });

  it("q는 낮을수록(더 유의) desc 기본에서 앞에 온다", () => {
    const rows = [delta({ id: "high-q", q: 0.5 }), delta({ id: "low-q", q: 0.01 })];
    expect(sortRows(rows, "q", "desc").map((r) => r.id)).toEqual(["low-q", "high-q"]);
  });

  it("n은 before+after 합", () => {
    const rows = [
      delta({ id: "small-n", n: { before: 10, after: 10 } }),
      delta({ id: "big-n", n: { before: 5000, after: 5000 } }),
    ];
    expect(sortRows(rows, "n", "desc").map((r) => r.id)).toEqual(["big-n", "small-n"]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const rows = [delta({ id: "a", delta: 0.01 }), delta({ id: "b", delta: 0.02 })];
    const original = [...rows];
    sortRows(rows, "absDelta", "desc");
    expect(rows).toEqual(original);
  });
});

describe("filterNotesBySection", () => {
  it("섹션이 일치하는 항목만", () => {
    const items = [note({ id: "a", section: "champion" }), note({ id: "b", section: "item" })];
    expect(filterNotesBySection(items, "item").map((i) => i.id)).toEqual(["b"]);
  });
});

describe("filterNotesBySearch", () => {
  const items = [
    note({ id: "a", entity: "아우렐리온 솔", skill: "Q - 빛의 숨결" }),
    note({ id: "b", entity: "트런들", skill: null }),
  ];

  it("빈 검색어는 전체 반환", () => {
    expect(filterNotesBySearch(items, "  ")).toHaveLength(2);
  });

  it("entity로 검색", () => {
    expect(filterNotesBySearch(items, "트런들").map((i) => i.id)).toEqual(["b"]);
  });

  it("skill로 검색(대소문자 무시)", () => {
    expect(filterNotesBySearch(items, "빛의").map((i) => i.id)).toEqual(["a"]);
  });
});

describe("representativeStatus", () => {
  it("짝지어진 델타가 없으면 null", () => {
    expect(representativeStatus("note:1", [delta({ matchedNoteIds: [] })])).toBeNull();
  });

  it("여러 델타 중 우선순위가 가장 높은 상태를 고른다(unannounced > inconsistent)", () => {
    const rows = [
      delta({ id: "1", matchedNoteIds: ["note:1"], status: "announced-inconsistent" }),
      delta({ id: "2", matchedNoteIds: ["note:1"], status: "unannounced" }),
    ];
    expect(representativeStatus("note:1", rows)).toBe("unannounced");
  });
});

describe("directionSymbol", () => {
  it("insufficient-sample은 항상 점(•)+muted", () => {
    expect(directionSymbol(delta({ status: "insufficient-sample", delta: 0.5 }))).toEqual({
      symbol: "•",
      colorClass: "text-muted",
    });
  });
  it("양수는 ▲/success", () => {
    expect(directionSymbol(delta({ status: "unannounced", delta: 0.02 }))).toEqual({
      symbol: "▲",
      colorClass: "text-success",
    });
  });
  it("음수는 ▼/danger", () => {
    expect(directionSymbol(delta({ status: "unannounced", delta: -0.02 }))).toEqual({
      symbol: "▼",
      colorClass: "text-danger",
    });
  });
});

describe("formatDeltaCell / formatCiCell / formatNCell", () => {
  it("insufficient-sample은 Δ·CI 모두 대시, n은 'n<200'", () => {
    const row = delta({ status: "insufficient-sample", delta: 0.5, ci: [0.1, 0.9], n: { before: 8, after: 8 } });
    expect(formatDeltaCell(row)).toBe("—");
    expect(formatCiCell(row)).toBe("—");
    expect(formatNCell(row)).toBe("n<200");
  });

  it("일반 pp 지표는 %p·CI·n/n을 정상 포맷한다", () => {
    const row = delta({ status: "unannounced", delta: 0.025, ci: [0.021, 0.029], n: { before: 10240, after: 10118 } });
    expect(formatDeltaCell(row)).toBe("+2.5%p");
    expect(formatCiCell(row)).toBe("±0.4");
    expect(formatNCell(row)).toBe("10,240/10,118");
  });
});

describe("shortNoteId", () => {
  it("null은 대시", () => {
    expect(shortNoteId(null)).toBe("—");
  });
  it("콜론 마지막 세그먼트만 남긴다", () => {
    expect(shortNoteId("note:26.17:champion:qiyana:5a6d587d")).toBe("5a6d587d");
  });
});

describe("computeCoverage", () => {
  it("빈 입력(rows=[], notes=null)에서도 0으로 안전하게 계산된다", () => {
    expect(computeCoverage([], null)).toEqual({
      noteEntityCount: 0,
      noteItemCount: 0,
      matchedCount: 0,
      unannouncedCount: 0,
      lowSampleCount: 0,
    });
  });

  it("상태별 집계 + 노트 엔티티 수(+원문 항목 수)", () => {
    const notes = notesFile([note({ id: "a", entity: "A" }), note({ id: "b", entity: "A" })]);
    const rows = [
      delta({ id: "1", status: "announced-consistent" }),
      delta({ id: "2", status: "unannounced" }),
      delta({ id: "3", status: "insufficient-sample" }),
      delta({ id: "4", status: "no-change" }),
    ];
    expect(computeCoverage(rows, notes)).toEqual({
      noteEntityCount: 1,
      noteItemCount: 2,
      matchedCount: 1,
      unannouncedCount: 1,
      lowSampleCount: 1,
    });
  });
});
