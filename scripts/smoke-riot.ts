// scripts/smoke-riot.ts
// ST-02 D+1 게이트 — 라이브 Riot API 스모크. 호출 총 4~5회로 끝낸다(Personal 키 리밋 보호).
// 원본 응답은 data/raw/samples/{league,matchIds,match,timeline}.json에 저장(gitignore 대상,
// data/raw/*는 커밋 금지)하고, 재실행 시 캐시가 있으면 재사용한다(--refresh로 강제 재호출).
// 절대 API 키 값을 출력하지 않는다.
// 실행: npx tsx scripts/smoke-riot.ts [--refresh]

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../src/pipeline/shared/env";
import { createRiotClient, type RiotMatchDto, type RiotMatchTimelineDto } from "../src/pipeline/collect/riot-client";
import { isMainModule, parseCliArgs } from "./shared/cli";

const SAMPLES_DIR = path.resolve(process.cwd(), "data", "raw", "samples");
// main()이 시작할 때 채워진다 — import만으로 인자 파싱(및 잠재적 에러)이 실행되지 않도록 top
// level에서 바로 계산하지 않는다(다른 run-*.ts 스크립트와 동일 관례).
let REFRESH = false;

function readCache<T>(name: string): T | null {
  const file = path.join(SAMPLES_DIR, name);
  if (REFRESH || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function writeCache(name: string, data: unknown): void {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  fs.writeFileSync(path.join(SAMPLES_DIR, name), JSON.stringify(data, null, 2), "utf8");
}

async function main(): Promise<void> {
  REFRESH = parseCliArgs("smoke-riot", process.argv.slice(2), [
    { name: "refresh", type: "boolean", default: false },
  ]).refresh as boolean;

  const env = loadEnv();
  const client = createRiotClient({
    apiKey: env.RIOT_API_KEY,
    platform: "kr",
    region: "asia",
    onRateLimit: (snapshot, url) => {
      console.log(`[rate-limit] ${url}`);
      console.log(`  X-App-Rate-Limit: ${snapshot.appRateLimit ?? "(none)"}`);
      console.log(`  X-App-Rate-Limit-Count: ${snapshot.appRateLimitCount ?? "(none)"}`);
      console.log(`  X-Method-Rate-Limit: ${snapshot.methodRateLimit ?? "(none)"}`);
      console.log(`  X-Method-Rate-Limit-Count: ${snapshot.methodRateLimitCount ?? "(none)"}`);
    },
  });

  try {
    // ① challenger entries — 1 call
    console.log("\n=== ① league-v4 challenger entries ===");
    let entries = readCache<Array<{ puuid: string; summonerId: string | null }>>("league-entries.json");
    if (!entries) {
      const raw = await client.getLeagueEntries("challenger");
      entries = raw;
      writeCache("league-entries.json", raw);
    } else {
      console.log("(캐시 재사용 — 실호출 없음)");
    }
    console.log(`entries.length = ${entries.length}`);
    console.log(`entries[0]에 puuid 필드 존재 = ${Boolean(entries[0]?.puuid)}`);

    const firstPuuid = entries[0]?.puuid;
    if (!firstPuuid) throw new Error("smoke: no puuid resolved from challenger entries");

    // ② match ids by puuid, count=5, startTime 필터 — 1 call
    console.log("\n=== ② match-v5 ids by puuid (count=5, startTime filter) ===");
    const startTime = Math.floor(Date.UTC(2026, 7, 25, 15, 0, 0) / 1000); // 2026-08-26 00:00 KST
    console.log(`startTime(epoch sec) = ${startTime} (2026-08-26 00:00 KST 계산값)`);
    let matchIds = readCache<string[]>("match-ids.json");
    if (!matchIds) {
      matchIds = await client.getMatchIdsByPuuid(firstPuuid, { startTime, count: 5 });
      writeCache("match-ids.json", matchIds);
    } else {
      console.log("(캐시 재사용 — 실호출 없음)");
    }
    console.log(`반환 개수 = ${matchIds.length}`);

    const firstMatchId = matchIds[0];
    if (!firstMatchId) throw new Error("smoke: no match ids returned (startTime window may be empty)");

    // ③ match detail — 1 call
    console.log("\n=== ③ match-v5 detail ===");
    let match = readCache<RiotMatchDto>("match.json");
    if (!match) {
      match = await client.getMatch(firstMatchId);
      if (!match) throw new Error(`smoke: getMatch(${firstMatchId}) returned null (404)`);
      writeCache("match.json", match);
    } else {
      console.log("(캐시 재사용 — 실호출 없음)");
    }
    console.log(`info.gameVersion (원문) = ${match.info.gameVersion}`);
    console.log(`info.gameCreation (ms) = ${match.info.gameCreation}`);
    console.log(
      `startTime 필터 검증: gameCreation(ms) >= startTime*1000 = ${
        match.info.gameCreation >= startTime * 1000
      }`
    );
    const p0 = match.info.participants[0] as unknown as Record<string, unknown>;
    const challenges = (p0?.challenges ?? {}) as Record<string, unknown>;
    console.log(`participants[0].challenges.goldPerMinute 존재 = ${"goldPerMinute" in challenges}`);
    console.log(
      `participants[0].challenges.laneMinionsFirst10Minutes 존재 = ${
        "laneMinionsFirst10Minutes" in challenges
      }`
    );
    console.log(`participants[0].challenges.damagePerMinute 존재 = ${"damagePerMinute" in challenges}`);
    const team0 = match.info.teams[0] as unknown as Record<string, unknown>;
    const objectives = (team0?.objectives ?? {}) as Record<string, unknown>;
    console.log(`teams[0].objectives 키 목록 = ${Object.keys(objectives).join(", ")}`);

    // ④ timeline — 1 call
    console.log("\n=== ④ match-v5 timeline ===");
    let timeline = readCache<RiotMatchTimelineDto>("timeline.json");
    if (!timeline) {
      timeline = await client.getMatchTimeline(firstMatchId);
      if (!timeline) throw new Error(`smoke: getMatchTimeline(${firstMatchId}) returned null (404)`);
      writeCache("timeline.json", timeline);
    } else {
      console.log("(캐시 재사용 — 실호출 없음)");
    }
    console.log(`info.frames.length = ${timeline.info.frames.length}`);
    const frame1 = timeline.info.frames[1] ?? timeline.info.frames[0];
    const pf1 = frame1?.participantFrames?.["1"] as unknown as Record<string, unknown> | undefined;
    console.log(`frame[1].participantFrames["1"].totalGold 존재 = ${Boolean(pf1 && "totalGold" in pf1)}`);
    const eventTypes = new Set<string>();
    for (const frame of timeline.info.frames) {
      for (const event of frame.events) eventTypes.add(event.type);
    }
    console.log(`events 타입 목록 샘플 = ${Array.from(eventTypes).slice(0, 20).join(", ")}`);

    console.log("\n=== 스모크 완료 (원본 JSON: data/raw/samples/) ===");
  } finally {
    await client.dispose();
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error("smoke-riot 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
