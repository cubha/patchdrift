import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectTimelines,
  reduceTimeline,
  sampleMatchIds,
  type TimelineProgressEvent,
} from "../timeline";
import { toMatchSlim, type RiotClient, type RiotMatchDto, type RiotMatchTimelineDto } from "../riot-client";
import type { LeagueEntrySlim } from "../riot-client";
import type { MatchSlim } from "../../types";
import fixtureMatch from "../../../__fixtures__/riot-match-26-17.json";
import fixtureTimeline from "../../../__fixtures__/riot-timeline-26-17.json";

// riot-match-26-17.json·riot-timeline-26-17.json은 같은 라이브 스모크 매치(KR_8367245341,
// docs/plan/verify-spec/ST-02.md)에서 나온 실제 응답을 축약한 것이다. 타임라인 fixture는 22프레임
// 중 3개(0분·10분·14분 근접)만 남기고, 오브젝트 이벤트(HORDE·TOWER·DRAGON·RIFTHERALD, 전부 실제
// timestamp 그대로)는 마지막 프레임의 events 배열에 모아 담았다 — reduceTimeline은 이벤트가 어느
// 프레임에 속하는지가 아니라 이벤트 자신의 timestamp만 보므로 정확성에는 영향이 없다. 실제
// 매치에는 BARON_NASHOR 킬이 없어(경기가 20분 만에 끝남) baronSec는 null 기대값으로 검증하고,
// baron 탐지 자체는 아래 별도 synthetic 케이스로 검증한다.
const FIXTURE_MATCH = fixtureMatch as unknown as RiotMatchDto;
const FIXTURE_TIMELINE = fixtureTimeline as unknown as RiotMatchTimelineDto;
const FIXTURE_SLIM: MatchSlim = toMatchSlim(FIXTURE_MATCH);

function withMatchId(slim: MatchSlim, matchId: string): MatchSlim {
  return { ...slim, matchId };
}

describe("reduceTimeline", () => {
  it("실측 fixture로 라인별 골드@10/@14를 블루/레드로 분리한다", () => {
    const slim = reduceTimeline(FIXTURE_SLIM, FIXTURE_TIMELINE);

    expect(slim.matchId).toBe("KR_8367245341");
    expect(slim.patch).toBe("26.17");

    // TOP blue=participantId 1, red=participantId 6 (match fixture teamPosition 순서 그대로)
    expect(slim.lanes.TOP).toEqual({
      blue: { goldAt10: 2831, goldAt14: 4383 },
      red: { goldAt10: 4324, goldAt14: 6384 },
    });
    expect(slim.lanes.JUNGLE).toEqual({
      blue: { goldAt10: 5498, goldAt14: 7610 },
      red: { goldAt10: 4230, goldAt14: 6234 },
    });
    expect(slim.lanes.MIDDLE).toEqual({
      blue: { goldAt10: 4858, goldAt14: 7203 },
      red: { goldAt10: 3706, goldAt14: 5145 },
    });
    expect(slim.lanes.BOTTOM).toEqual({
      blue: { goldAt10: 3635, goldAt14: 5910 },
      red: { goldAt10: 4409, goldAt14: 7418 },
    });
    expect(slim.lanes.UTILITY).toEqual({
      blue: { goldAt10: 3267, goldAt14: 4700 },
      red: { goldAt10: 3074, goldAt14: 4700 },
    });
  });

  it("첫 오브젝트 시각(초)을 ELITE_MONSTER_KILL(monsterType)·BUILDING_KILL(TOWER_BUILDING)에서 뽑는다", () => {
    const slim = reduceTimeline(FIXTURE_SLIM, FIXTURE_TIMELINE);

    expect(slim.firstObjectives.dragonSec).toBe(736); // 736213ms → floor
    expect(slim.firstObjectives.heraldSec).toBe(994); // 994817ms → floor
    expect(slim.firstObjectives.towerSec).toBe(720); // 720916ms → floor
    // 실제 매치엔 바론 킬이 없다(20분 만에 종료) — HORDE 이벤트가 섞여 있어도 오검출하지 않는다.
    expect(slim.firstObjectives.baronSec).toBeNull();
  });

  it("BARON_NASHOR monsterType과 동시 발생 시에도 각 오브젝트 타입별 최초 시각만 남긴다(synthetic)", () => {
    const syntheticTimeline: RiotMatchTimelineDto = {
      metadata: { matchId: "SYN_1" },
      info: {
        frameInterval: 60000,
        frames: [
          {
            timestamp: 0,
            participantFrames: Object.fromEntries(
              Array.from({ length: 10 }, (_, i) => [String(i + 1), { totalGold: 500 }])
            ),
            events: [
              { type: "ELITE_MONSTER_KILL", timestamp: 500_000, monsterType: "DRAGON" },
              { type: "ELITE_MONSTER_KILL", timestamp: 1_500_000, monsterType: "BARON_NASHOR" },
              { type: "ELITE_MONSTER_KILL", timestamp: 1_600_000, monsterType: "BARON_NASHOR" },
              { type: "BUILDING_KILL", timestamp: 400_000, buildingType: "TOWER_BUILDING" },
              // 계약 외 오브젝트(방장 몬스터 등)는 무시되어야 한다.
              { type: "ELITE_MONSTER_KILL", timestamp: 100_000, monsterType: "ATAKHAN" },
            ],
          },
        ],
      },
    };

    const slim = reduceTimeline(FIXTURE_SLIM, syntheticTimeline);

    expect(slim.firstObjectives.dragonSec).toBe(500);
    expect(slim.firstObjectives.baronSec).toBe(1500); // 두 번째 바론(1,600,000ms)이 아니라 최초값
    expect(slim.firstObjectives.towerSec).toBe(400);
    expect(slim.firstObjectives.heraldSec).toBeNull();
  });

  it("10/14분 프레임이 없는 짧은 경기는 해당 골드·오브젝트 값이 null이다(타입이 허용, skip 불필요)", () => {
    const shortTimeline: RiotMatchTimelineDto = {
      metadata: { matchId: "SYN_SHORT" },
      info: {
        frameInterval: 60000,
        frames: [
          {
            timestamp: 0,
            participantFrames: Object.fromEntries(
              Array.from({ length: 10 }, (_, i) => [String(i + 1), { totalGold: 500 }])
            ),
            events: [],
          },
          {
            timestamp: 300_000, // 5분 — 10/14분 프레임 없음
            participantFrames: Object.fromEntries(
              Array.from({ length: 10 }, (_, i) => [String(i + 1), { totalGold: 3000 }])
            ),
            events: [],
          },
        ],
      },
    };

    const slim = reduceTimeline(FIXTURE_SLIM, shortTimeline);

    expect(slim.lanes.TOP).toEqual({
      blue: { goldAt10: null, goldAt14: null },
      red: { goldAt10: null, goldAt14: null },
    });
    expect(slim.firstObjectives).toEqual({
      dragonSec: null,
      heraldSec: null,
      baronSec: null,
      towerSec: null,
    });
  });
});

describe("sampleMatchIds", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pd-sample-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeMatchesJsonl(matchIds: string[]): string {
    const file = path.join(tmpDir, "matches.jsonl");
    const lines = matchIds.map((id) => JSON.stringify(withMatchId(FIXTURE_SLIM, id)));
    fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
    return file;
  }

  it("같은 seed면 항상 같은 표본을 결정론적으로 반환한다", () => {
    const file = writeMatchesJsonl(["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"]);

    const first = sampleMatchIds(file, 3, 42);
    const second = sampleMatchIds(file, 3, 42);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    for (const id of first) {
      expect(["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"]).toContain(id);
    }
  });

  it("다른 seed는 다른 순서/구성을 낼 수 있다(같은 seed 재현성과 대비)", () => {
    const file = writeMatchesJsonl(["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"]);

    const a = sampleMatchIds(file, 8, 1);
    const b = sampleMatchIds(file, 8, 2);

    // 둘 다 전체 집합이지만 셔플 순서가 다르다(같은 seed면 순서까지 동일해야 하므로 반대 증거).
    // sort()는 배열을 in-place로 변형하므로 원본 a/b 비교보다 반드시 나중에 수행한다.
    expect(a).not.toEqual(b);
    expect(a.slice().sort()).toEqual(b.slice().sort());
  });

  it("k가 전체 개수 이상이면 전체를 반환한다", () => {
    const file = writeMatchesJsonl(["M1", "M2", "M3"]);
    const sampled = sampleMatchIds(file, 100, 7);
    expect(sampled.slice().sort()).toEqual(["M1", "M2", "M3"]);
  });

  it("seed 미지정 시에도 기본 seed로 결정론적이다(호출 간 동일 결과)", () => {
    const file = writeMatchesJsonl(["M1", "M2", "M3", "M4", "M5"]);
    expect(sampleMatchIds(file, 2)).toEqual(sampleMatchIds(file, 2));
  });
});

describe("collectTimelines", () => {
  let tmpDataRoot: string;

  beforeEach(() => {
    tmpDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pd-collect-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDataRoot, { recursive: true, force: true });
  });

  function writeMatches(patch: string, matchIds: string[]): void {
    const dir = path.join(tmpDataRoot, "raw", patch);
    fs.mkdirSync(dir, { recursive: true });
    const lines = matchIds.map((id) => JSON.stringify(withMatchId(FIXTURE_SLIM, id)));
    fs.writeFileSync(path.join(dir, "matches.jsonl"), `${lines.join("\n")}\n`, "utf8");
  }

  function readTimelineMatchIds(patch: string): string[] {
    const file = path.join(tmpDataRoot, "raw", patch, "timelines.jsonl");
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => (JSON.parse(line) as { matchId: string }).matchId);
  }

  function makeMockClient(
    behavior: (matchId: string) => Promise<RiotMatchTimelineDto | null>
  ): RiotClient & { getMatchTimeline: ReturnType<typeof vi.fn> } {
    const getMatchTimeline = vi.fn(behavior);
    return {
      getLeagueEntries: async (): Promise<LeagueEntrySlim[]> => {
        throw new Error("not used in this test");
      },
      getMatchIdsByPuuid: async (): Promise<string[]> => {
        throw new Error("not used in this test");
      },
      getMatch: async (): Promise<RiotMatchDto | null> => {
        throw new Error("not used in this test");
      },
      getMatchTimeline,
      dispose: async (): Promise<void> => {},
    };
  }

  it("표본을 수집·축약해 timelines.jsonl에 append하고, null/error를 결과에 집계한다", async () => {
    writeMatches("26.17", ["M1", "M2", "M3"]);
    const client = makeMockClient(async (matchId) => {
      if (matchId === "M1") return { ...FIXTURE_TIMELINE, metadata: { matchId: "M1" } };
      if (matchId === "M2") return null;
      throw new Error("boom");
    });

    const events: TimelineProgressEvent[] = [];
    const result = await collectTimelines(client, {
      patch: "26.17",
      sample: 3,
      seed: 1,
      dataRoot: tmpDataRoot,
      onProgress: (e) => events.push(e),
    });

    expect(result).toEqual({ written: 1, skipped: 0, nulls: 1, errors: 1 });
    expect(readTimelineMatchIds("26.17")).toEqual(["M1"]);
    expect(client.getMatchTimeline).toHaveBeenCalledTimes(3);
    expect(events).toHaveLength(3);
    expect(events.some((e) => e.status === "written" && e.matchId === "M1")).toBe(true);
    expect(events.some((e) => e.status === "null" && e.matchId === "M2")).toBe(true);
    expect(events.some((e) => e.status === "error" && e.matchId === "M3" && e.error === "boom")).toBe(
      true
    );
  });

  it("재실행 시 이미 timelines.jsonl에 있는 matchId는 재호출 없이 스킵한다(idempotent 재개)", async () => {
    writeMatches("26.17", ["M1", "M2", "M3"]);
    const client = makeMockClient(async (matchId) => {
      if (matchId === "M1") return { ...FIXTURE_TIMELINE, metadata: { matchId: "M1" } };
      if (matchId === "M2") return null;
      throw new Error("boom");
    });

    await collectTimelines(client, { patch: "26.17", sample: 3, seed: 1, dataRoot: tmpDataRoot });
    expect(client.getMatchTimeline).toHaveBeenCalledTimes(3);

    const second = await collectTimelines(client, {
      patch: "26.17",
      sample: 3,
      seed: 1,
      dataRoot: tmpDataRoot,
    });

    // M1은 이미 기록되어 스킵, M2/M3는 성공 기록이 없었으므로 재시도된다.
    expect(second).toEqual({ written: 0, skipped: 1, nulls: 1, errors: 1 });
    expect(client.getMatchTimeline).toHaveBeenCalledTimes(5);
    expect(readTimelineMatchIds("26.17")).toEqual(["M1"]);
  });
});
