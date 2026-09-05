import { describe, it, expect, vi } from "vitest";
import { createRiotClient, toMatchSlim, type RiotMatchDto } from "../riot-client";
import fixtureMatch from "../../../__fixtures__/riot-match-26-17.json";

// 실제 라이브 스모크(scripts/smoke-riot.ts, 2026-09-05 kr/asia KR_8367245341)에서 받은 응답을
// 트리밍(puuid만 익명화)한 fixture. gameVersion "16.17.810.4348" 형태·challenges 3필드·
// teams[].objectives의 horde(void 유충)·atakhan 키 존재를 실측대로 반영한다.
const FIXTURE_MATCH = fixtureMatch as unknown as RiotMatchDto;

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function noSleep(): (ms: number) => Promise<void> {
  const calls: number[] = [];
  const fn = (ms: number) => {
    calls.push(ms);
    return Promise.resolve();
  };
  (fn as unknown as { calls: number[] }).calls = calls;
  return fn as unknown as (ms: number) => Promise<void>;
}

function fastLimiters() {
  return {
    appLimiterOptions: { reservoir: null, minTime: 0, maxConcurrent: 1 },
    globalLimiterOptions: { reservoir: null, minTime: 0 },
  };
}

describe("toMatchSlim", () => {
  it("raw match-v5 응답을 MatchSlim으로 reduce한다 (실측 fixture)", () => {
    const slim = toMatchSlim(FIXTURE_MATCH);

    expect(slim.matchId).toBe("KR_8367245341");
    expect(slim.gameVersion).toBe("16.17.810.4348");
    expect(slim.patch).toBe("26.17");
    expect(slim.gameCreationMs).toBe(FIXTURE_MATCH.info.gameCreation);
    expect(slim.gameDurationSec).toBe(FIXTURE_MATCH.info.gameDuration);
    expect(slim.queueId).toBe(420);
    expect(slim.participants).toHaveLength(10);
    expect(slim.teams).toHaveLength(2);
  });

  it("참가자 필드를 ParticipantSlim 계약대로 매핑한다(items 7슬롯·challenges)", () => {
    const slim = toMatchSlim(FIXTURE_MATCH);
    const p0 = slim.participants[0];

    expect(p0.puuid).toBe("PUUID_0");
    expect(p0.items).toHaveLength(7);
    expect(p0.items).toEqual([3124, 6672, 3006, 1086, 0, 0, 3363]);
    expect(p0.challenges.goldPerMinute).toBeCloseTo(397.0098743014199);
    expect(p0.challenges.laneMinionsFirst10Minutes).toBe(62);
    expect(p0.challenges.damagePerMinute).toBeCloseTo(824.2700311314719, 5);
  });

  it("teams[].objectives의 horde를 grubs로 매핑하고, atakhan 등 미계약 키는 버린다", () => {
    const slim = toMatchSlim(FIXTURE_MATCH);
    const team0 = slim.teams[0];

    expect(team0.objectives.dragon).toEqual(FIXTURE_MATCH.info.teams[0].objectives.dragon);
    expect(team0.objectives.grubs).toEqual(
      (FIXTURE_MATCH.info.teams[0].objectives as unknown as Record<string, { first: boolean; kills: number }>)
        .horde
    );
    expect(team0.objectives).not.toHaveProperty("atakhan");
    expect(team0.bans).toEqual(FIXTURE_MATCH.info.teams[0].bans.map((b) => b.championId));
  });

  it("participants.length !== 10이면 throw한다(데이터 손상을 조용히 자르지 않는다)", () => {
    const broken: RiotMatchDto = {
      ...FIXTURE_MATCH,
      info: { ...FIXTURE_MATCH.info, participants: FIXTURE_MATCH.info.participants.slice(0, 9) },
    };
    expect(() => toMatchSlim(broken)).toThrow(/10 participants/);
  });

  it("teams.length !== 2이면 throw한다", () => {
    const broken: RiotMatchDto = {
      ...FIXTURE_MATCH,
      info: { ...FIXTURE_MATCH.info, teams: FIXTURE_MATCH.info.teams.slice(0, 1) },
    };
    expect(() => toMatchSlim(broken)).toThrow(/2 teams/);
  });
});

describe("createRiotClient — retry/limit 동작 (fetch 모킹)", () => {
  it("429 응답 시 Retry-After(초) 만큼 대기 후 재시도해 성공한다", async () => {
    const sleep = noSleep();
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return jsonResponse({ message: "rate limited" }, { status: 429, headers: { "Retry-After": "2" } });
      }
      return jsonResponse(["m1", "m2"]);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      ...fastLimiters(),
    });

    const ids = await client.getMatchIdsByPuuid("puuid-1", { count: 5 });
    expect(ids).toEqual(["m1", "m2"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect((sleep as unknown as { calls: number[] }).calls).toEqual([2000]);
    await client.dispose();
  });

  it("Retry-After 헤더가 없으면 지수 백오프(1s→)로 대기한다", async () => {
    const sleep = noSleep();
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call <= 2) return jsonResponse({}, { status: 429 });
      return jsonResponse([]);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      ...fastLimiters(),
    });

    await client.getMatchIdsByPuuid("puuid-1");
    expect((sleep as unknown as { calls: number[] }).calls).toEqual([1000, 2000]);
    await client.dispose();
  });

  it("429 재시도가 5회를 넘으면 throw한다", async () => {
    const sleep = noSleep();
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 429 }));

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      ...fastLimiters(),
    });

    await expect(client.getMatchIdsByPuuid("puuid-1")).rejects.toThrow(/429/);
    expect(fetchImpl).toHaveBeenCalledTimes(6); // 최초 1회 + 재시도 5회
    await client.dispose();
  });

  it("5xx 응답은 지수 백오프로 최대 3회 재시도 후 성공하면 반환한다", async () => {
    const sleep = noSleep();
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call <= 2) return jsonResponse({}, { status: 503 });
      return jsonResponse([]);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      ...fastLimiters(),
    });

    const ids = await client.getMatchIdsByPuuid("puuid-1");
    expect(ids).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await client.dispose();
  });

  it("5xx가 재시도 예산(3회)을 넘으면 throw한다", async () => {
    const sleep = noSleep();
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 500 }));

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      ...fastLimiters(),
    });

    await expect(client.getMatchIdsByPuuid("puuid-1")).rejects.toThrow(/5xx/);
    expect(fetchImpl).toHaveBeenCalledTimes(4); // 최초 1회 + 재시도 3회
    await client.dispose();
  });

  it("네트워크 오류(fetch throw)도 지수 백오프로 재시도한다", async () => {
    const sleep = noSleep();
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) throw new Error("ECONNRESET");
      return jsonResponse([]);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      ...fastLimiters(),
    });

    const ids = await client.getMatchIdsByPuuid("puuid-1");
    expect(ids).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await client.dispose();
  });

  it("getMatch: 404는 null을 반환한다(매치 없음)", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    const match = await client.getMatch("KR_0000000000");
    expect(match).toBeNull();
    await client.dispose();
  });

  it("getMatchTimeline: 404는 null을 반환한다", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    const timeline = await client.getMatchTimeline("KR_0000000000");
    expect(timeline).toBeNull();
    await client.dispose();
  });

  it("getLeagueEntries: 404는 재시도 없이 즉시 throw한다(entries 목록에는 null 허용 안 함)", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    await expect(client.getLeagueEntries("challenger")).rejects.toThrow(/404/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await client.dispose();
  });

  it("403은 재시도 없이 즉시 throw하고, 메시지에 API 키 값을 포함하지 않는다", async () => {
    const apiKey = "RGAPI-secret-value-should-not-leak";
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }));
    const client = createRiotClient({
      apiKey,
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    await expect(client.getMatch("KR_1")).rejects.toThrow(/403/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    try {
      await client.getMatch("KR_1");
    } catch (error) {
      expect((error as Error).message).not.toContain(apiKey);
    }
    await client.dispose();
  });

  it("X-Riot-Token 헤더로 키를 전달한다(URL에는 포함하지 않는다)", async () => {
    let capturedHeaders: Headers | undefined;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      expect(url).not.toContain("RGAPI-test");
      return jsonResponse([]);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    await client.getMatchIdsByPuuid("puuid-1");
    expect(capturedHeaders?.get("X-Riot-Token")).toBe("RGAPI-test");
    await client.dispose();
  });

  it("X-Method-Rate-Limit* 헤더를 onRateLimit 콜백으로만 노출한다(자체 재시도 판단에 쓰지 않음)", async () => {
    const onRateLimit = vi.fn();
    const fetchImpl = vi.fn(
      async () =>
        jsonResponse([], {
          headers: {
            "X-App-Rate-Limit": "20:1,100:120",
            "X-App-Rate-Limit-Count": "1:1,1:120",
            "X-Method-Rate-Limit": "2000:10",
            "X-Method-Rate-Limit-Count": "1:10",
          },
        })
    );

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      onRateLimit,
      ...fastLimiters(),
    });

    await client.getMatchIdsByPuuid("puuid-1");
    expect(onRateLimit).toHaveBeenCalledTimes(1);
    const [snapshot] = onRateLimit.mock.calls[0] as [
      { appRateLimit: string | null; methodRateLimit: string | null },
      string
    ];
    expect(snapshot.methodRateLimit).toBe("2000:10");
    await client.dispose();
  });

  it("getLeagueEntries: entries에 puuid가 있으면 summoner-v4 폴백 없이 그대로 매핑한다", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        tier: "CHALLENGER",
        leagueId: "x",
        queue: "RANKED_SOLO_5x5",
        name: "x",
        entries: [{ puuid: "puuid-a", summonerId: "sum-a", leaguePoints: 1000, wins: 10, losses: 5 }],
      })
    );

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    const entries = await client.getLeagueEntries("challenger");
    expect(entries).toEqual([
      { puuid: "puuid-a", summonerId: "sum-a", leaguePoints: 1000, wins: 10, losses: 5 },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // summoner-v4 폴백 호출 없음
    await client.dispose();
  });

  it("getLeagueEntries: puuid가 없으면 summoner-v4로 폴백 해석한다", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/league/v4/")) {
        return jsonResponse({
          tier: "CHALLENGER",
          leagueId: "x",
          queue: "RANKED_SOLO_5x5",
          name: "x",
          entries: [{ summonerId: "sum-b", leaguePoints: 900, wins: 8, losses: 6 }],
        });
      }
      if (url.includes("/summoner/v4/summoners/sum-b")) {
        return jsonResponse({ puuid: "resolved-puuid-b" });
      }
      throw new Error(`unexpected url in test: ${url}`);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    const entries = await client.getLeagueEntries("grandmaster");
    expect(entries).toEqual([
      { puuid: "resolved-puuid-b", summonerId: "sum-b", leaguePoints: 900, wins: 8, losses: 6 },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await client.dispose();
  });

  it("getMatchIdsByPuuid: startTime/queue/count 쿼리 파라미터를 URL에 반영한다", async () => {
    let capturedUrl = "";
    const fetchImpl = vi.fn(async (url: string) => {
      capturedUrl = url;
      return jsonResponse(["m1"]);
    });

    const client = createRiotClient({
      apiKey: "RGAPI-test",
      platform: "kr",
      region: "asia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep(),
      ...fastLimiters(),
    });

    await client.getMatchIdsByPuuid("puuid-1", { startTime: 1787670000, count: 5 });
    expect(capturedUrl).toContain("/lol/match/v5/matches/by-puuid/puuid-1/ids");
    expect(capturedUrl).toContain("startTime=1787670000");
    expect(capturedUrl).toContain("count=5");
    expect(capturedUrl).toContain("queue=420");
    expect(capturedUrl).toContain("type=ranked");
    await client.dispose();
  });
});
