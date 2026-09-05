import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WIN_RATE_MIN_N } from "../../aggregate/stats";
import { applyVerdicts, assignStatus, indexNotesById, sortDeltas, writeDeltas } from "../verdict";
import type { EntityMatchInfo, EntityMatchOutcome } from "../entity-match";
import type { DeltaRecord, MatchStatus, PatchNoteItem } from "../../types";

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
    ci: [0.01, 0.09], // 0 미포함
    n: { before: WIN_RATE_MIN_N, after: WIN_RATE_MIN_N },
    q: 0.01, // < 0.10 → 유의
    status: "no-change",
    matchedNoteId: null,
    matchedNoteIds: [],
    causes: [],
    evidence: { matchIds: [], aggregatePath: "x", noteAnchor: null },
    ...overrides,
  };
}

const CONSISTENT_MATCH: EntityMatchInfo = { noteIds: ["n1"], directionAgreement: "consistent" };
const INCONSISTENT_MATCH: EntityMatchInfo = { noteIds: ["n1"], directionAgreement: "inconsistent" };
const NEUTRAL_MATCH: EntityMatchInfo = { noteIds: ["n1"], directionAgreement: "neutral" };

describe("assignStatus", () => {
  it("유의 + 노트 짝(방향 일치) → announced-consistent", () => {
    expect(assignStatus(delta({}), CONSISTENT_MATCH)).toBe("announced-consistent");
  });

  it("유의 + 노트 짝(방향 불일치) → announced-inconsistent", () => {
    expect(assignStatus(delta({}), INCONSISTENT_MATCH)).toBe("announced-inconsistent");
  });

  it("유의 + 노트 짝(방향 중립) → announced-inconsistent", () => {
    expect(assignStatus(delta({}), NEUTRAL_MATCH)).toBe("announced-inconsistent");
  });

  it("유의 + 노트 짝 없음 → unannounced", () => {
    expect(assignStatus(delta({}), null)).toBe("unannounced");
  });

  it("비유의(q>=0.10) + 노트 짝 있음 → announced-inconsistent", () => {
    const d = delta({ q: 0.5 });
    expect(assignStatus(d, CONSISTENT_MATCH)).toBe("announced-inconsistent");
  });

  it("비유의 + 노트 짝 없음 → no-change", () => {
    const d = delta({ q: 0.5 });
    expect(assignStatus(d, null)).toBe("no-change");
  });

  it("CI가 0을 포함하면(비유의 취급) 노트 짝 없어도 no-change", () => {
    const d = delta({ q: 0.01, ci: [-0.01, 0.09] });
    expect(assignStatus(d, null)).toBe("no-change");
  });

  it("winRate + n 게이트 미달은 유의/노트 여부와 무관하게 무조건 insufficient-sample", () => {
    const d = delta({ n: { before: 50, after: 300 } });
    expect(assignStatus(d, CONSISTENT_MATCH)).toBe("insufficient-sample");
    expect(assignStatus(d, null)).toBe("insufficient-sample");
    expect(assignStatus(delta({ n: { before: 50, after: 300 }, q: 0.9 }), null)).toBe(
      "insufficient-sample"
    );
  });

  it("winRate가 아닌 지표(pickRate)는 n 게이트를 적용하지 않는다", () => {
    const d = delta({ metric: "pickRate", n: { before: 10, after: 10 } });
    expect(assignStatus(d, null)).toBe("unannounced");
  });
});

describe("applyVerdicts", () => {
  it("매칭 결과로 status/matchedNoteId(s)/evidence.noteAnchor를 채운다", () => {
    const notes: PatchNoteItem[] = [
      {
        id: "n1",
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
      },
    ];
    const deltas = [delta({ id: "champion:Aatrox:winRate" })];
    const outcome: EntityMatchOutcome = {
      matches: new Map([["champion:Aatrox:winRate", CONSISTENT_MATCH]]),
      mappingFailures: [],
    };

    const result = applyVerdicts(deltas, outcome, indexNotesById(notes));
    expect(result[0].status).toBe("announced-consistent");
    expect(result[0].matchedNoteId).toBe("n1");
    expect(result[0].matchedNoteIds).toEqual(["n1"]);
    expect(result[0].evidence.noteAnchor).toBe("https://example.com/#patch-aatrox");
  });

  it("매칭 없는 델타는 matchedNoteId=null·noteAnchor=null 유지", () => {
    const deltas = [delta({ id: "champion:Aatrox:winRate", q: 0.9 })];
    const outcome: EntityMatchOutcome = { matches: new Map(), mappingFailures: [] };

    const result = applyVerdicts(deltas, outcome, indexNotesById([]));
    expect(result[0].status).toBe("no-change");
    expect(result[0].matchedNoteId).toBeNull();
    expect(result[0].matchedNoteIds).toEqual([]);
    expect(result[0].evidence.noteAnchor).toBeNull();
  });

  it("원본 배열을 변경하지 않는다(불변)", () => {
    const original = delta({ id: "champion:Aatrox:winRate" });
    const deltas = [original];
    const outcome: EntityMatchOutcome = { matches: new Map(), mappingFailures: [] };
    applyVerdicts(deltas, outcome, indexNotesById([]));
    expect(original.status).toBe("no-change"); // 원본 값 그대로(mutate 안 됨)
  });
});

describe("sortDeltas", () => {
  it("status 우선순위(unannounced > announced-inconsistent > announced-consistent > insufficient-sample > no-change) → |delta| 내림차순", () => {
    const rows: Array<{ status: MatchStatus; delta: number | null; id: string }> = [
      { status: "no-change", delta: 0.5, id: "a" },
      { status: "unannounced", delta: 0.01, id: "b" },
      { status: "announced-consistent", delta: 0.9, id: "c" },
      { status: "unannounced", delta: 0.5, id: "d" },
      { status: "insufficient-sample", delta: null, id: "e" },
      { status: "announced-inconsistent", delta: -0.3, id: "f" },
    ];
    const deltas = rows.map((r) => delta({ id: r.id, status: r.status, delta: r.delta }));
    const sorted = sortDeltas(deltas).map((d) => d.id);
    // unannounced 그룹 내에서는 |delta| 내림차순: d(0.5) 앞에, b(0.01) 뒤
    expect(sorted).toEqual(["d", "b", "f", "c", "e", "a"]);
  });
});

describe("writeDeltas", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "verdict-write-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("deltas/{from}_{to}.json에 정렬된 rows + meta(counts 포함)를 기록한다", () => {
    const deltas = [
      delta({ id: "a", status: "unannounced", delta: 0.5 }),
      delta({ id: "b", status: "no-change", delta: 0.01 }),
    ];
    const result = writeDeltas({ from: "26.16", to: "26.17", deltas, dataRoot: tmpRoot });

    expect(result.filePath).toBe(path.join(tmpRoot, "aggregated", "deltas", "26.16_26.17.json"));
    expect(fs.existsSync(result.filePath)).toBe(true);

    const written = JSON.parse(fs.readFileSync(result.filePath, "utf8"));
    expect(written.meta.from).toBe("26.16");
    expect(written.meta.to).toBe("26.17");
    expect(written.meta.n).toBe(2);
    expect(written.meta.counts).toEqual({ unannounced: 1, "no-change": 1 });
    expect(written.rows[0].id).toBe("a"); // unannounced가 우선순위 최상단
    expect(written.rows[1].id).toBe("b");
  });

  it("llm 메타를 전달하면 meta.llm에 그대로 실린다", () => {
    const deltas = [delta({ id: "a" })];
    const llm = {
      calls: 3,
      cacheHits: 1,
      skipped: 0,
      usage: { inputTokens: 100, cacheReadInputTokens: 50, cacheCreationInputTokens: 0, outputTokens: 20 },
    };
    const result = writeDeltas({ from: "26.16", to: "26.17", deltas, llm, dataRoot: tmpRoot });
    const written = JSON.parse(fs.readFileSync(result.filePath, "utf8"));
    expect(written.meta.llm).toEqual(llm);
  });
});
