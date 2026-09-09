import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crawlPatch } from "../crawler";
import { appendSeenId } from "../checkpoint";
import type {
  GetMatchIdsOptions,
  LeagueEntrySlim,
  LeagueTier,
  RiotClient,
  RiotMatchDto,
} from "../riot-client";
import type { MatchSlim } from "../../types";

const PATCH = "26.17";
const GAME_VERSION_26_17 = "16.17.810.1000";
const GAME_VERSION_26_16 = "16.16.700.1000";

function makeParticipant(index: number, puuid: string) {
  return {
    puuid,
    championId: 100 + index,
    championName: `Champ${index}`,
    teamId: index < 5 ? 100 : 200,
    teamPosition: "TOP",
    win: index < 5,
    kills: 1,
    deaths: 1,
    assists: 1,
    item0: 0,
    item1: 0,
    item2: 0,
    item3: 0,
    item4: 0,
    item5: 0,
    item6: 0,
    goldEarned: 1000,
    challenges: {},
  };
}

function makeTeam(teamId: number, win: boolean) {
  return {
    teamId,
    win,
    bans: [{ championId: 1, pickTurn: 1 }],
    objectives: {
      baron: { first: false, kills: 0 },
      dragon: { first: false, kills: 0 },
      riftHerald: { first: false, kills: 0 },
      tower: { first: false, kills: 0 },
    },
  };
}

function makeMatchDto(matchId: string, gameVersion: string): RiotMatchDto {
  return {
    metadata: { matchId },
    info: {
      gameCreation: 1_700_000_000_000,
      gameDuration: 1800,
      gameVersion,
      queueId: 420,
      participants: Array.from({ length: 10 }, (_, i) => makeParticipant(i, `puuid-${matchId}-${i}`)),
      teams: [makeTeam(100, true), makeTeam(200, false)],
    },
  };
}

interface FakeClientConfig {
  /** 시드 puuid(순서 그대로 반환되도록 챌린저 티어에 LP 내림차순으로 배치). */
  puuids: string[];
  /** puuid → 전체 매치ID 목록(페이지네이션은 슬라이스로 흉내낸다) | "throw"(ids 조회 실패 흉내). */
  matchIdsByPuuid: Record<string, string[] | "throw">;
  /** matchId → RiotMatchDto | null(404) | "throw"(네트워크 에러 흉내). */
  matches: Record<string, RiotMatchDto | null | "throw">;
}

function makeFakeClient(config: FakeClientConfig) {
  const getMatchCalls: string[] = [];
  const getMatchIdsCalls: { puuid: string; options: GetMatchIdsOptions }[] = [];

  const client: RiotClient = {
    getLeagueEntries: vi.fn(async (tier: LeagueTier): Promise<LeagueEntrySlim[]> => {
      if (tier !== "challenger") return [];
      return config.puuids.map((puuid, idx) => ({
        puuid,
        summonerId: null,
        leaguePoints: config.puuids.length - idx, // 배열 순서 = LP 내림차순
        wins: 0,
        losses: 0,
      }));
    }),
    getMatchIdsByPuuid: vi.fn(async (puuid: string, options: GetMatchIdsOptions = {}) => {
      getMatchIdsCalls.push({ puuid, options });
      const spec = config.matchIdsByPuuid[puuid];
      if (spec === "throw") throw new Error(`fake ids-fetch failure for ${puuid}`);
      const all = spec ?? [];
      const start = options.start ?? 0;
      const count = options.count ?? 100;
      return all.slice(start, start + count);
    }),
    getMatch: vi.fn(async (matchId: string) => {
      getMatchCalls.push(matchId);
      const entry = config.matches[matchId];
      if (entry === "throw") throw new Error(`fake network failure for ${matchId}`);
      return entry ?? null;
    }),
    getMatchTimeline: vi.fn(async () => null),
    dispose: vi.fn(async () => {}),
  };

  return { client, getMatchCalls, getMatchIdsCalls };
}

function readMatchesJsonl(dataRoot: string): MatchSlim[] {
  const file = path.join(dataRoot, "raw", PATCH, "matches.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as MatchSlim);
}

let dataRoot: string;

beforeEach(() => {
  dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patchgap-crawler-"));
});

afterEach(() => {
  fs.rmSync(dataRoot, { recursive: true, force: true });
});

describe("crawlPatch — gameVersion 접두 컷", () => {
  it("canonicalPatch(gameVersion) !== patch인 매치는 skippedVersion으로 세고 seen에 기록한다", async () => {
    const { client, getMatchIdsCalls } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["good", "bad"] },
      matches: {
        good: makeMatchDto("good", GAME_VERSION_26_17),
        bad: makeMatchDto("bad", GAME_VERSION_26_16),
      },
    });

    const result = await crawlPatch(client, { patch: PATCH, target: 10, dataRoot, idsPerPuuid: 10 });

    expect(result).toEqual({ collected: 1, skippedVersion: 1, skippedSeen: 0, errors: 0 });
    const matches = readMatchesJsonl(dataRoot);
    expect(matches.map((m) => m.matchId)).toEqual(["good"]);

    const seenRaw = fs.readFileSync(path.join(dataRoot, "raw", PATCH, "seen-ids.txt"), "utf8");
    expect(seenRaw).toContain("bad");
    expect(seenRaw).toContain("good");

    // 시간창 후보 축소값이 patch-calendar에서 계산돼 실제로 전달됐는지도 함께 확인한다.
    expect(getMatchIdsCalls[0]?.options.startTime).toBeTypeOf("number");
  });
});

describe("crawlPatch — seen-ids 스킵", () => {
  it("이미 seen-ids에 있는 matchId는 getMatch를 호출하지 않고 건너뛴다", async () => {
    appendSeenId({ patch: PATCH, dataRoot }, "already-seen");

    const { client, getMatchCalls } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["already-seen", "new"] },
      matches: { new: makeMatchDto("new", GAME_VERSION_26_17) },
    });

    const result = await crawlPatch(client, { patch: PATCH, target: 10, dataRoot, idsPerPuuid: 10 });

    expect(result).toEqual({ collected: 1, skippedVersion: 0, skippedSeen: 1, errors: 0 });
    expect(getMatchCalls).toEqual(["new"]);
  });
});

describe("crawlPatch — target 정지", () => {
  it("target에 도달하면 puuid 중간이라도 즉시 멈춘다", async () => {
    const { client, getMatchCalls } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["m1", "m2", "m3"] },
      matches: {
        m1: makeMatchDto("m1", GAME_VERSION_26_17),
        m2: makeMatchDto("m2", GAME_VERSION_26_17),
        m3: makeMatchDto("m3", GAME_VERSION_26_17),
      },
    });

    const result = await crawlPatch(client, { patch: PATCH, target: 2, dataRoot, idsPerPuuid: 10 });

    expect(result).toEqual({ collected: 2, skippedVersion: 0, skippedSeen: 0, errors: 0 });
    expect(getMatchCalls).toEqual(["m1", "m2"]); // m3는 아예 조회되지 않는다
  });
});

describe("crawlPatch — 재개(idempotent)", () => {
  it("2회 실행 시 이미 수집한 매치를 건너뛰고 중복 없이 이어서 수집한다", async () => {
    const matchIdsByPuuid = { p1: ["m1", "m2", "m3"], p2: ["m4", "m5"] };
    const matches: Record<string, RiotMatchDto> = {
      m1: makeMatchDto("m1", GAME_VERSION_26_17),
      m2: makeMatchDto("m2", GAME_VERSION_26_17),
      m3: makeMatchDto("m3", GAME_VERSION_26_17),
      m4: makeMatchDto("m4", GAME_VERSION_26_17),
      m5: makeMatchDto("m5", GAME_VERSION_26_17),
    };

    const first = makeFakeClient({ puuids: ["p1", "p2"], matchIdsByPuuid, matches });
    const firstResult = await crawlPatch(first.client, {
      patch: PATCH,
      target: 2,
      dataRoot,
      idsPerPuuid: 3,
    });
    expect(firstResult.collected).toBe(2);
    expect(readMatchesJsonl(dataRoot).map((m) => m.matchId)).toEqual(["m1", "m2"]);

    const second = makeFakeClient({ puuids: ["p1", "p2"], matchIdsByPuuid, matches });
    const secondResult = await crawlPatch(second.client, {
      patch: PATCH,
      target: 5,
      dataRoot,
      idsPerPuuid: 3,
    });

    // m1, m2는 seen-ids에 있어 다시 수집되지 않고, m3·m4·m5만 새로 수집된다.
    expect(secondResult.collected).toBe(3);
    expect(secondResult.skippedSeen).toBe(2);

    const finalMatchIds = readMatchesJsonl(dataRoot).map((m) => m.matchId);
    expect(finalMatchIds).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(new Set(finalMatchIds).size).toBe(finalMatchIds.length); // 중복 없음
  });
});

describe("crawlPatch — 404/데이터 손상", () => {
  it("getMatch가 null(404)이면 seen에 기록하고 건너뛴다(에러로 세지 않는다)", async () => {
    const { client } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["missing"] },
      matches: { missing: null },
    });

    const result = await crawlPatch(client, { patch: PATCH, target: 10, dataRoot, idsPerPuuid: 10 });

    expect(result).toEqual({ collected: 0, skippedVersion: 0, skippedSeen: 0, errors: 0 });
    const seenRaw = fs.readFileSync(path.join(dataRoot, "raw", PATCH, "seen-ids.txt"), "utf8");
    expect(seenRaw).toContain("missing");
  });

  it("getMatch가 throw하면 errors로 세고 seen에는 남기지 않는다(다음 실행에서 재시도)", async () => {
    const { client } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["flaky"] },
      matches: { flaky: "throw" },
    });

    const result = await crawlPatch(client, { patch: PATCH, target: 10, dataRoot, idsPerPuuid: 10 });

    expect(result).toEqual({ collected: 0, skippedVersion: 0, skippedSeen: 0, errors: 1 });
    const seenFile = path.join(dataRoot, "raw", PATCH, "seen-ids.txt");
    expect(fs.existsSync(seenFile) ? fs.readFileSync(seenFile, "utf8") : "").not.toContain("flaky");
  });
});

describe("crawlPatch — 중단 신호", () => {
  it("signal.aborted면 더 이상 매치를 처리하지 않고 즉시 멈춘다", async () => {
    const controller = new AbortController();
    controller.abort();

    const { client, getMatchCalls } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["m1"] },
      matches: { m1: makeMatchDto("m1", GAME_VERSION_26_17) },
    });

    const result = await crawlPatch(client, {
      patch: PATCH,
      target: 10,
      dataRoot,
      idsPerPuuid: 10,
      signal: controller.signal,
    });

    expect(result).toEqual({ collected: 0, skippedVersion: 0, skippedSeen: 0, errors: 0 });
    expect(getMatchCalls).toEqual([]);
  });
});

describe("crawlPatch — 진행 로그", () => {
  it("logEvery 간격마다 onProgress를 호출한다", async () => {
    const { client } = makeFakeClient({
      puuids: ["p1"],
      matchIdsByPuuid: { p1: ["m1", "m2"] },
      matches: {
        m1: makeMatchDto("m1", GAME_VERSION_26_17),
        m2: makeMatchDto("m2", GAME_VERSION_26_17),
      },
    });

    const snapshots: number[] = [];
    await crawlPatch(client, {
      patch: PATCH,
      target: 10,
      dataRoot,
      idsPerPuuid: 10,
      logEvery: 1,
      onProgress: (s) => snapshots.push(s.collected),
    });

    // logEvery=1이므로 매치마다 1회 + 종료 시 최종 보고 1회.
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    expect(snapshots.at(-1)).toBe(2);
  });
});

describe("crawlPatch — 커서 전진 시점(scope-critic 경계 2)", () => {
  it("target 도달로 puuid 중간에서 멈추면 커서는 그 puuid에 머문다(다음 puuid로 전진하지 않는다)", async () => {
    const { client } = makeFakeClient({
      puuids: ["p1", "p2"],
      matchIdsByPuuid: { p1: ["m1", "m2"], p2: ["m3"] },
      matches: {
        m1: makeMatchDto("m1", GAME_VERSION_26_17),
        m2: makeMatchDto("m2", GAME_VERSION_26_17),
        m3: makeMatchDto("m3", GAME_VERSION_26_17),
      },
    });

    // target=1: p1의 첫 매치(m1)에서 target 도달 — p1은 아직 페이지 순회를 끝내지 못했다.
    await crawlPatch(client, { patch: PATCH, target: 1, dataRoot, idsPerPuuid: 10 });

    const state = JSON.parse(
      fs.readFileSync(path.join(dataRoot, "raw", PATCH, "collect-state.json"), "utf8")
    ) as { cursorPuuid: string | null };
    expect(state.cursorPuuid).toBe("p1"); // p2로 전진하지 않았다
  });

  it("puuid의 페이지 순회를 완전히 마치면 커서가 다음 puuid로 전진한다", async () => {
    const { client } = makeFakeClient({
      puuids: ["p1", "p2"],
      matchIdsByPuuid: { p1: ["m1"], p2: ["m2"] },
      matches: {
        m1: makeMatchDto("m1", GAME_VERSION_26_17),
        m2: makeMatchDto("m2", GAME_VERSION_26_17),
      },
    });

    // target을 크게 잡아 p1을 완전히 소진시키고 p2 진행 중 target 미도달 상태로 puuid도 소진되게 한다.
    await crawlPatch(client, { patch: PATCH, target: 100, dataRoot, idsPerPuuid: 10 });

    const state = JSON.parse(
      fs.readFileSync(path.join(dataRoot, "raw", PATCH, "collect-state.json"), "utf8")
    ) as { cursorPuuid: string | null };
    // p1·p2 모두 완전히 소진(마지막 페이지 도달)됐고 puuid 목록도 소진됐으므로 다음 실행은
    // 처음부터 다시 훑는다(cursorPuuid=null) — seen-ids가 중복 재수집을 막는다.
    expect(state.cursorPuuid).toBeNull();
  });
});

describe("crawlPatch — 시드 재생성 후 재개(결함 1 수정)", () => {
  it("시드가 재생성(순서 변경)돼도 어떤 puuid도 영구 스킵되지 않는다", async () => {
    const matchIdsByPuuid = { A: ["a1", "a2"], B: ["b1", "b2", "b3"], C: ["c1", "c2"] };
    const allIds = ["a1", "a2", "b1", "b2", "b3", "c1", "c2"];
    const matches: Record<string, RiotMatchDto> = Object.fromEntries(
      allIds.map((id) => [id, makeMatchDto(id, GAME_VERSION_26_17)])
    );

    let now = 1_000_000;
    const nowMs = () => now;

    // 1회차: LP 순서 A > B > C. target=3 → A(2건) 완주 + B 진행 중 1건에서 target 도달.
    const first = makeFakeClient({ puuids: ["A", "B", "C"], matchIdsByPuuid, matches });
    const firstResult = await crawlPatch(first.client, {
      patch: PATCH,
      target: 3,
      dataRoot,
      idsPerPuuid: 10,
      nowMs,
    });
    expect(firstResult.collected).toBe(3);
    expect(readMatchesJsonl(dataRoot).map((m) => m.matchId)).toEqual(["a1", "a2", "b1"]);

    const stateAfterFirst = JSON.parse(
      fs.readFileSync(path.join(dataRoot, "raw", PATCH, "collect-state.json"), "utf8")
    ) as { cursorPuuid: string | null };
    expect(stateAfterFirst.cursorPuuid).toBe("B"); // B 중간에서 멈췄으므로 커서는 B

    now += 24 * 60 * 60 * 1000 + 1; // 시드 캐시 만료 → 재생성 유도

    // 2회차: LP 순서가 바뀌어 C가 1위로 올라온다(예: 그사이 승률이 좋았다).
    const second = makeFakeClient({ puuids: ["C", "A", "B"], matchIdsByPuuid, matches });
    const secondResult = await crawlPatch(second.client, {
      patch: PATCH,
      target: 7,
      dataRoot,
      idsPerPuuid: 10,
      nowMs,
    });

    const finalIds = readMatchesJsonl(dataRoot).map((m) => m.matchId);
    // 옛 "인덱스 기반" 커서였다면 재개 시 배열 index=1(구 순서에서 B였던 자리)부터 시작해, 새
    // 순서([C,A,B])에서 index 0인 C를 절대 방문하지 않아 c1/c2가 영구 누락됐을 것이다.
    // 값 기반 커서 + 시드 재생성 시 전체 재순회(seen-ids가 중복만 막음) 덕분에 전부 수집된다.
    expect(new Set(finalIds)).toEqual(new Set(allIds));
    expect(finalIds).toHaveLength(7);
    expect(secondResult.collected).toBe(4); // b2, b3, c1, c2 (a1, a2, b1은 seen-ids로 스킵)
    expect(secondResult.skippedSeen).toBe(3); // a1, a2, b1
  });
});

describe("crawlPatch — 매치ID 조회 실패(scope-critic 경계 3)", () => {
  it("실패한 puuid는 같은 실행 내에서 다음 puuid로 넘어가되, 커서는 그 puuid에 고정된다", async () => {
    const { client, getMatchIdsCalls } = makeFakeClient({
      puuids: ["A", "B"],
      matchIdsByPuuid: { A: "throw", B: ["b1"] },
      matches: { b1: makeMatchDto("b1", GAME_VERSION_26_17) },
    });

    const result = await crawlPatch(client, { patch: PATCH, target: 10, dataRoot, idsPerPuuid: 10 });

    expect(result).toEqual({ collected: 1, skippedVersion: 0, skippedSeen: 0, errors: 1 });
    expect(getMatchIdsCalls.map((c) => c.puuid)).toEqual(["A", "B"]); // A 실패 후 B로 계속 진행

    const state = JSON.parse(
      fs.readFileSync(path.join(dataRoot, "raw", PATCH, "collect-state.json"), "utf8")
    ) as { cursorPuuid: string | null };
    expect(state.cursorPuuid).toBe("A"); // 실패한 A에 커서가 고정된다(B가 성공했어도 넘어가지 않음)
  });

  it("커서가 고정된 puuid는 다음 실행에서 다시 시도되고, 성공하면 재개가 이어진다", async () => {
    const first = makeFakeClient({
      puuids: ["A", "B"],
      matchIdsByPuuid: { A: "throw", B: ["b1"] },
      matches: { b1: makeMatchDto("b1", GAME_VERSION_26_17) },
    });
    await crawlPatch(first.client, { patch: PATCH, target: 10, dataRoot, idsPerPuuid: 10 });

    // 2회차: 시드 캐시가 아직 신선해 재조회 없이 재사용된다 — A가 이번엔 정상 응답한다.
    const second = makeFakeClient({
      puuids: ["A", "B"],
      matchIdsByPuuid: { A: ["a1"], B: ["b1"] },
      matches: { a1: makeMatchDto("a1", GAME_VERSION_26_17), b1: makeMatchDto("b1", GAME_VERSION_26_17) },
    });
    const secondResult = await crawlPatch(second.client, {
      patch: PATCH,
      target: 10,
      dataRoot,
      idsPerPuuid: 10,
    });

    expect(secondResult.collected).toBe(1); // a1만 신규(b1은 seen)
    expect(secondResult.skippedSeen).toBe(1);
    const finalIds = readMatchesJsonl(dataRoot).map((m) => m.matchId);
    expect(new Set(finalIds)).toEqual(new Set(["a1", "b1"]));
  });

  it("매치ID 조회가 연속 N회 실패하면 크롤을 중단한다(키/네트워크 문제로 간주)", async () => {
    const puuids = ["p1", "p2", "p3", "p4", "p5"];
    const matchIdsByPuuid = Object.fromEntries(puuids.map((p) => [p, "throw" as const]));
    const { client, getMatchIdsCalls } = makeFakeClient({ puuids, matchIdsByPuuid, matches: {} });

    const result = await crawlPatch(client, {
      patch: PATCH,
      target: 10,
      dataRoot,
      idsPerPuuid: 10,
      maxConsecutiveIdsFailures: 3,
    });

    expect(result.errors).toBe(3);
    expect(getMatchIdsCalls).toHaveLength(3); // 3회 실패 후 중단 — 나머지 puuid는 시도조차 안 한다

    const state = JSON.parse(
      fs.readFileSync(path.join(dataRoot, "raw", PATCH, "collect-state.json"), "utf8")
    ) as { cursorPuuid: string | null };
    expect(state.cursorPuuid).toBe("p1"); // 최초로 실패한 puuid에 커서가 고정된다
  });
});
