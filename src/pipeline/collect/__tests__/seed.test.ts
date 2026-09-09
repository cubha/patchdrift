import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectSeedPuuids } from "../seed";
import type { LeagueEntrySlim, LeagueTier, RiotClient } from "../riot-client";

function entry(puuid: string, leaguePoints: number): LeagueEntrySlim {
  return { puuid, summonerId: null, leaguePoints, wins: 0, losses: 0 };
}

/** 티어별 응답을 주입하는 가짜 RiotClient. seed.ts는 getLeagueEntries만 호출한다. */
function makeFakeClient(byTier: Partial<Record<LeagueTier, LeagueEntrySlim[]>>) {
  const calls: LeagueTier[] = [];
  const client: RiotClient = {
    getLeagueEntries: vi.fn(async (tier: LeagueTier) => {
      calls.push(tier);
      return byTier[tier] ?? [];
    }),
    getMatchIdsByPuuid: vi.fn(async () => []),
    getMatch: vi.fn(async () => null),
    getMatchTimeline: vi.fn(async () => null),
    dispose: vi.fn(async () => {}),
  };
  return { client, calls };
}

let dataRoot: string;

beforeEach(() => {
  dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patchgap-seed-"));
});

afterEach(() => {
  fs.rmSync(dataRoot, { recursive: true, force: true });
});

describe("collectSeedPuuids", () => {
  it("순서는 챌린저→GM→마스터, 티어 내부는 LP 내림차순이다", async () => {
    const { client } = makeFakeClient({
      challenger: [entry("c-low", 500), entry("c-high", 900)],
      grandmaster: [entry("gm-1", 700)],
      master: [entry("m-1", 100)],
    });

    const { puuids } = await collectSeedPuuids(client, { patch: "26.17", dataRoot });

    expect(puuids).toEqual(["c-high", "c-low", "gm-1", "m-1"]);
  });

  it("티어 간 중복 puuid는 먼저 등장한(더 높은 티어) 것만 남기고 제거한다", async () => {
    const { client } = makeFakeClient({
      challenger: [entry("dup", 900)],
      grandmaster: [entry("dup", 700), entry("gm-only", 650)],
      master: [],
    });

    const { puuids } = await collectSeedPuuids(client, { patch: "26.17", dataRoot });

    expect(puuids).toEqual(["dup", "gm-only"]);
  });

  it("limit은 반환 개수만 제한한다(캐시에는 전체가 저장된다)", async () => {
    const { client } = makeFakeClient({
      challenger: [entry("a", 3), entry("b", 2), entry("c", 1)],
    });

    const limited = await collectSeedPuuids(client, { patch: "26.17", dataRoot, limit: 2 });
    expect(limited.puuids).toEqual(["a", "b"]);

    const cacheRaw = JSON.parse(
      fs.readFileSync(path.join(dataRoot, "raw", "26.17", "seed-puuids.json"), "utf8")
    ) as { puuids: string[]; createdAtMs: number };
    expect(cacheRaw.puuids).toEqual(["a", "b", "c"]);
    expect(limited.createdAtMs).toBe(cacheRaw.createdAtMs);
  });

  it("24시간 이내 캐시가 있으면 league-v4를 재호출하지 않고 createdAtMs도 그대로 유지한다", async () => {
    let now = 1_000_000;
    const nowMs = () => now;

    const { client: firstClient, calls: firstCalls } = makeFakeClient({
      challenger: [entry("a", 1)],
    });
    const first = await collectSeedPuuids(firstClient, { patch: "26.17", dataRoot, nowMs });
    expect(first.puuids).toEqual(["a"]);
    expect(first.createdAtMs).toBe(1_000_000);
    expect(firstCalls).toHaveLength(3); // challenger + grandmaster + master 기본 3티어

    now += 60_000; // 1분 경과 — 캐시 신선
    const { client: secondClient, calls: secondCalls } = makeFakeClient({
      challenger: [entry("should-not-be-seen", 1)],
    });
    const second = await collectSeedPuuids(secondClient, { patch: "26.17", dataRoot, nowMs });

    expect(second.puuids).toEqual(["a"]);
    // createdAtMs는 캐시 히트 시 "캐시가 만들어진 시각"을 그대로 보존한다(지금 시각이 아니다) —
    // crawler.ts가 이 값으로 collect-state.json의 seedCreatedAtMs와 비교해 재개 유효성을 판단한다.
    expect(second.createdAtMs).toBe(1_000_000);
    expect(secondCalls).toHaveLength(0);
  });

  it("24시간이 지난 캐시는 만료로 취급해 다시 조회하고 createdAtMs를 갱신한다", async () => {
    let now = 1_000_000;
    const nowMs = () => now;

    const { client: firstClient } = makeFakeClient({ challenger: [entry("old", 1)] });
    await collectSeedPuuids(firstClient, { patch: "26.17", dataRoot, nowMs });

    now += 24 * 60 * 60 * 1000 + 1; // 24시간 + 1ms 경과

    const { client: secondClient, calls: secondCalls } = makeFakeClient({
      challenger: [entry("fresh", 1)],
    });
    const second = await collectSeedPuuids(secondClient, { patch: "26.17", dataRoot, nowMs });

    expect(second.puuids).toEqual(["fresh"]);
    expect(second.createdAtMs).toBe(now);
    expect(secondCalls.length).toBeGreaterThan(0);
  });
});
