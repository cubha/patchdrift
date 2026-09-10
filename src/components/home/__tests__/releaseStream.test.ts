// src/components/home/__tests__/releaseStream.test.ts
// 릴리즈노트 스트림 조립(releaseStream.ts) 단위 테스트 — ST-B TDD.
// 최소 케이스: 노트만 있음(정상) / 델타만 있음(미공지 삽입) / 둘 다 있음(정상 짝) /
// 미공지 여러 건 |delta| 내림차순 정렬.

import { describe, expect, it } from "vitest";
import type { DeltaRecord, PatchNoteItem } from "@/pipeline/types";
import type { DeltasFile } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";
import { buildReleaseStream } from "../releaseStream";

function note(overrides: Partial<PatchNoteItem>): PatchNoteItem {
  return {
    id: "note:26.17:champion:x:0000",
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
    meta: {
      patch: "26.17",
      sourceUrl: "https://example.com",
      fetchedAt: "2026-09-05T00:00:00.000Z",
      itemCount: items.length,
    },
    summary: "요약",
    sections: [],
    items,
  };
}

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
    n: { before: 1000, after: 1000 },
    q: 0.02,
    status: "unannounced",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "#", noteAnchor: null },
    ...overrides,
  };
}

function deltasFile(rows: DeltaRecord[]): DeltasFile {
  return {
    meta: { from: "26.16", to: "26.17", generatedAt: "2026-09-05T05:00:00.000Z", n: rows.length, counts: {}, qAlpha: 0.1 },
    rows,
  };
}

describe("buildReleaseStream", () => {
  it("notes/deltas 둘 다 null이면 빈 배열", () => {
    expect(buildReleaseStream(null, null)).toEqual([]);
  });

  it("노트만 있고 델타가 없으면 정상(matched) 그룹으로만 구성된다", () => {
    const notes = notesFile([
      note({ id: "a", entity: "아우렐리온 솔", skill: "Q", stat: "마나 소모량" }),
      note({ id: "b", entity: "아우렐리온 솔", skill: "W", stat: "재사용 대기시간" }),
    ]);
    const stream = buildReleaseStream(notes, null);
    expect(stream).toEqual([
      { kind: "matched", entity: "아우렐리온 솔", notes: notes.items },
    ]);
  });

  it("노트 그룹 순서는 notes.json 원본(첫 등장) 순서를 유지한다", () => {
    const notes = notesFile([
      note({ id: "a", entity: "그레이브즈" }),
      note({ id: "b", entity: "초가스" }),
      note({ id: "c", entity: "그레이브즈" }),
    ]);
    const stream = buildReleaseStream(notes, null);
    expect(stream.map((g) => g.entity)).toEqual(["그레이브즈", "초가스"]);
  });

  it("델타만 있고(status=unannounced) 대응 노트가 없으면 미공지 그룹이 상단에 삽입된다", () => {
    const deltas = deltasFile([
      delta({ id: "champion:Locke:banRate", entityKey: "Locke", entityName: "로크", status: "unannounced", delta: -0.13 }),
    ]);
    const stream = buildReleaseStream(null, deltas);
    expect(stream).toHaveLength(1);
    expect(stream[0]).toEqual({
      kind: "unannounced",
      entity: "로크",
      deltas: deltas.rows,
    });
  });

  it("status가 unannounced가 아닌 델타(예: no-change)는 미공지 그룹에 들어가지 않는다", () => {
    const deltas = deltasFile([
      delta({ id: "champion:Locke:banRate", entityKey: "Locke", entityName: "로크", status: "no-change" }),
    ]);
    expect(buildReleaseStream(null, deltas)).toEqual([]);
  });

  it("둘 다 있으면(노트 그룹 + 델타 존재) 정상 짝으로 matched 그룹 하나만 나온다", () => {
    const notes = notesFile([note({ id: "a", entity: "키아나", skill: "Q" })]);
    const deltas = deltasFile([
      delta({
        id: "champion:Qiyana:banRate",
        entityKey: "Qiyana",
        entityName: "키아나",
        status: "announced-inconsistent",
        matchedNoteId: "a",
        matchedNoteIds: ["a"],
      }),
    ]);
    const stream = buildReleaseStream(notes, deltas);
    expect(stream).toEqual([{ kind: "matched", entity: "키아나", notes: notes.items }]);
  });

  it("미공지 여러 건은 |delta| 내림차순으로 정렬되어 스트림 상단에 온다", () => {
    const notes = notesFile([note({ id: "a", entity: "공지된챔프" })]);
    const deltas = deltasFile([
      delta({ id: "champion:A:pickRate", entityKey: "A", entityName: "작은변화", status: "unannounced", delta: 0.05 }),
      delta({ id: "champion:B:pickRate", entityKey: "B", entityName: "큰변화", status: "unannounced", delta: -0.3 }),
      delta({ id: "champion:C:pickRate", entityKey: "C", entityName: "중간변화", status: "unannounced", delta: 0.15 }),
    ]);
    const stream = buildReleaseStream(notes, deltas);
    expect(stream.map((g) => g.entity)).toEqual(["큰변화", "중간변화", "작은변화", "공지된챔프"]);
  });

  it("같은 엔티티의 미공지 델타가 여럿이면 하나의 그룹으로 묶인다", () => {
    const deltas = deltasFile([
      delta({ id: "champion:Locke:banRate", entityKey: "Locke", entityName: "로크", metric: "banRate", status: "unannounced", delta: -0.13 }),
      delta({ id: "champion:Locke:pickRate", entityKey: "Locke", entityName: "로크", metric: "pickRate", status: "unannounced", delta: 0.02 }),
    ]);
    const stream = buildReleaseStream(null, deltas);
    expect(stream).toHaveLength(1);
    expect(stream[0].kind).toBe("unannounced");
    if (stream[0].kind === "unannounced") {
      expect(stream[0].deltas).toHaveLength(2);
    }
  });

  it("champion 외 entityType(lane/objective/summary)의 미공지 델타도 그룹에 포함된다(필터링하지 않음, scope-critic 2026-09-10 확인)", () => {
    const deltas = deltasFile([
      delta({
        id: "lane:BOTTOM:goldAt10",
        entityType: "lane",
        entityKey: "BOTTOM",
        entityName: "바텀",
        metric: "goldAt10",
        status: "unannounced",
        delta: 120,
      }),
      delta({
        id: "objective:dragon:firstSec",
        entityType: "objective",
        entityKey: "dragon",
        entityName: "첫 용",
        metric: "firstSec",
        status: "unannounced",
        delta: -15,
      }),
    ]);
    const stream = buildReleaseStream(null, deltas);
    expect(stream.map((g) => g.entity).sort()).toEqual(["바텀", "첫 용"].sort());
    expect(stream.every((g) => g.kind === "unannounced")).toBe(true);
  });
});
