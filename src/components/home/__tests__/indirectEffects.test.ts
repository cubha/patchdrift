// src/components/home/__tests__/indirectEffects.test.ts
// 홈 간접 영향 섹션 선택 로직(indirectEffects.ts) 단위 테스트 — ST-IE6 TDD.
// "드레이븐 패턴"(챔피언 노트 0건인데 픽/밴/승률 이동 ← 그 챔프가 올리는 아이템 변경)을
// 인과 체인으로 보여주기 위해 델타 + 원인 노트를 묶어 반환한다.

import { describe, expect, it } from "vitest";
import type { DeltaRecord, DeltasFile, LlmCause, PatchNoteItem } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";
import { selectIndirectEffects } from "../indirectEffects";

function cause(overrides: Partial<LlmCause>): LlmCause {
  return {
    text: "폭풍갈퀴 공격 속도 강화가 제리 라인전 파워를 높였을 수 있습니다",
    candidateNoteId: "note:item:stormrazor",
    verified: true,
    confidence: "medium",
    ...overrides,
  };
}

function delta(overrides: Partial<DeltaRecord>): DeltaRecord {
  return {
    id: "champion:Zeri:winRate",
    entityType: "champion",
    entityKey: "Zeri",
    entityName: "제리",
    metric: "winRate",
    before: 0.48,
    after: 0.5375,
    delta: 0.0575,
    ci: [0.01, 0.1],
    n: { before: 1000, after: 1000 },
    q: 0.08,
    status: "indirect-effect",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [cause({})],
    evidence: { matchIds: [], aggregatePath: "#", noteAnchor: "https://example.com/#stormrazor" },
    ...overrides,
  };
}

function note(overrides: Partial<PatchNoteItem>): PatchNoteItem {
  return {
    id: "note:item:stormrazor",
    patch: "26.17",
    section: "item",
    entity: "폭풍갈퀴",
    skill: null,
    stat: "공격 속도",
    before: "20%",
    after: "25%",
    direction: "buff",
    summary: "공격 속도: 20% ⇒ 25%",
    anchorUrl: "https://example.com/#stormrazor",
    anchorKind: "entity",
    ...overrides,
  };
}

function deltasFile(rows: DeltaRecord[]): DeltasFile {
  return {
    meta: { from: "26.16", to: "26.17", generatedAt: "2026-09-13T00:00:00.000Z", n: rows.length, counts: {}, qAlpha: 0.1 },
    rows,
  };
}

function notesFile(items: PatchNoteItem[]): NotesFile {
  return {
    meta: { patch: "26.17", sourceUrl: "https://example.com", fetchedAt: "2026-09-13T00:00:00.000Z", itemCount: items.length },
    summary: "요약",
    sections: [],
    items,
  };
}

describe("selectIndirectEffects", () => {
  it("deltas/notes가 null이면 빈 배열", () => {
    expect(selectIndirectEffects(null, null)).toEqual([]);
  });

  it("indirect-effect 행만 고른다(unannounced·below-threshold 제외)", () => {
    const rows = [
      delta({ id: "a", status: "indirect-effect" }),
      delta({ id: "b", status: "unannounced" }),
      delta({ id: "c", status: "below-threshold" }),
    ];
    const result = selectIndirectEffects(deltasFile(rows), notesFile([note({})]));
    expect(result.map((r) => r.record.id)).toEqual(["a"]);
  });

  it("원인 노트를 해석해 엔티티·섹션·앵커를 함께 반환한다(인과 체인)", () => {
    const result = selectIndirectEffects(deltasFile([delta({})]), notesFile([note({})]));
    expect(result[0].causeEntity).toBe("폭풍갈퀴");
    expect(result[0].causeSection).toBe("item");
    expect(result[0].causeAnchor).toBe("https://example.com/#stormrazor");
    expect(result[0].causeText).toContain("폭풍갈퀴");
  });

  it("같은 엔티티 종류 안에서는 |delta| 내림차순으로 정렬한다", () => {
    const rows = [
      delta({ id: "small", delta: 0.01 }),
      delta({ id: "big", delta: -0.09 }),
      delta({ id: "mid", delta: 0.05 }),
    ];
    const result = selectIndirectEffects(deltasFile(rows), notesFile([note({})]));
    expect(result.map((r) => r.record.id)).toEqual(["big", "mid", "small"]);
  });

  it("행위자(champion·item)를 집계 지표(lane·objective·summary)보다 앞에 둔다 — 집계 지표가 구성원 변경으로 움직이는 건 산술적으로 자명해 발견 가치가 낮고, 골드 절댓값(수십~수백)이 비율(0.0x)을 압도해 정렬을 독점하는 문제도 함께 막는다", () => {
    const rows = [
      delta({
        id: "lane:BOTTOM:goldAt14",
        entityType: "lane",
        entityKey: "BOTTOM",
        entityName: "바텀",
        metric: "goldAt14",
        delta: 72, // 절댓값은 압도적으로 크지만 자명한 인과
      }),
      delta({ id: "champion:Zeri:winRate", delta: 0.0575 }),
    ];
    const result = selectIndirectEffects(deltasFile(rows), notesFile([note({})]));
    expect(result.map((r) => r.record.id)).toEqual(["champion:Zeri:winRate", "lane:BOTTOM:goldAt14"]);
  });

  it("limit으로 상위 N건만 자른다(기본 5)", () => {
    const rows = Array.from({ length: 8 }, (_, i) => delta({ id: `d${i}`, delta: (8 - i) / 100 }));
    expect(selectIndirectEffects(deltasFile(rows), notesFile([note({})]))).toHaveLength(5);
    expect(selectIndirectEffects(deltasFile(rows), notesFile([note({})]), 3)).toHaveLength(3);
  });

  it("임계 신뢰도 미만(low) 후보만 있는 행은 제외한다 — 재분류 규칙과 같은 기준을 쓴다", () => {
    const rows = [delta({ id: "low-only", causes: [cause({ confidence: "low" })] })];
    expect(selectIndirectEffects(deltasFile(rows), notesFile([note({})]))).toEqual([]);
  });

  it("후보 노트가 notes에 없으면 엔티티는 null이되 행 자체는 유지한다(status는 이미 확정)", () => {
    const rows = [delta({ causes: [cause({ candidateNoteId: "note:없음" })] })];
    const result = selectIndirectEffects(deltasFile(rows), notesFile([note({})]));
    expect(result).toHaveLength(1);
    expect(result[0].causeEntity).toBeNull();
    expect(result[0].causeAnchor).toBeNull();
  });
});
