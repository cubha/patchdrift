// src/pipeline/collect/seed.ts
// 시드 파이프라인: KR 챌린저/GM/마스터 → puuid 집합. 순서는 챌린저→GM→마스터, 티어 내 LP
// 내림차순이며 중복 puuid는 먼저 등장한 것(더 높은 티어)을 남긴다. 24시간 캐시로 league-v4
// 호출을 아낀다(PLAN F1: "KR 챌린저/GM/마스터 시드 → puuid").

import fs from "node:fs";
import path from "node:path";
import type { PatchId } from "../types";
import type { LeagueTier, RiotClient } from "./riot-client";
import { rawDir } from "../shared/paths";

const DEFAULT_TIERS: readonly LeagueTier[] = ["challenger", "grandmaster", "master"];
const SEED_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SeedOptions {
  patch: PatchId;
  /** 기본값: 챌린저→GM→마스터(순서가 곧 우선순위). */
  tiers?: readonly LeagueTier[];
  /** 반환 puuid 개수 상한(디버깅/테스트용). 캐시 파일 자체는 항상 전체 집합을 저장한다. */
  limit?: number;
  /** 테스트 주입용 데이터 루트 오버라이드. 생략 시 process.cwd()/data. */
  dataRoot?: string;
  /** 테스트 주입용 시계. 생략 시 Date.now. */
  nowMs?: () => number;
}

interface SeedCacheFile {
  puuids: string[];
  createdAtMs: number;
}

function seedCacheFile(patch: PatchId, dataRoot?: string): string {
  const dir = dataRoot ? path.join(dataRoot, "raw", patch) : rawDir(patch);
  return path.join(dir, "seed-puuids.json");
}

function readFreshCache(file: string, nowMsValue: number): SeedCacheFile | null {
  if (!fs.existsSync(file)) return null;
  let parsed: SeedCacheFile;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SeedCacheFile;
  } catch {
    return null;
  }
  if (nowMsValue - parsed.createdAtMs > SEED_CACHE_MAX_AGE_MS) return null;
  return parsed;
}

function writeCache(file: string, puuids: string[], createdAtMs: number): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload: SeedCacheFile = { puuids, createdAtMs };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
}

/**
 * `collectSeedPuuids`의 결과. `createdAtMs`는 이 puuid 순서 집합이 확정된 시각(캐시 히트 시
 * 캐시 파일의 생성 시각, 미스 시 새로 조회한 시각)이다 — crawler.ts가 재개 커서
 * (`collect-state.json`의 `cursorPuuid`)의 유효성을 판단하는 데 쓴다: 시드가 24시간 TTL로
 * 재생성되면 LP 변동으로 puuid 순서가 바뀔 수 있어, 이전 실행의 배열 인덱스를 그대로 재사용하면
 * 다른 puuid를 가리켜 앞쪽 puuid가 영구 스킵되는 결함이 생긴다(scope-critic 결함 1 수정).
 */
export interface SeedResult {
  puuids: string[];
  createdAtMs: number;
}

/**
 * KR 챌린저/GM/마스터 시드 puuid를 모아 중복 제거된 배열로 반환한다.
 * 순서: 챌린저 → 그랜드마스터 → 마스터, 각 티어 내부는 leaguePoints 내림차순.
 * `data/raw/{patch}/seed-puuids.json`에 24시간 캐시하며, 캐시가 신선하면 league-v4 호출 없이
 * 재사용한다(limit은 반환 시점에만 적용 — 캐시 자체는 항상 전체 집합을 저장한다).
 */
export async function collectSeedPuuids(client: RiotClient, options: SeedOptions): Promise<SeedResult> {
  const tiers = options.tiers ?? DEFAULT_TIERS;
  const nowMs = options.nowMs ?? Date.now;
  const cacheFile = seedCacheFile(options.patch, options.dataRoot);

  const cached = readFreshCache(cacheFile, nowMs());
  let ordered: string[];
  let createdAtMs: number;

  if (cached) {
    ordered = cached.puuids;
    createdAtMs = cached.createdAtMs;
  } else {
    ordered = await fetchOrderedPuuids(client, tiers);
    createdAtMs = nowMs();
    writeCache(cacheFile, ordered, createdAtMs);
  }

  const puuids = options.limit !== undefined ? ordered.slice(0, options.limit) : ordered;
  return { puuids, createdAtMs };
}

async function fetchOrderedPuuids(client: RiotClient, tiers: readonly LeagueTier[]): Promise<string[]> {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const tier of tiers) {
    const entries = await client.getLeagueEntries(tier);
    const sortedByLpDesc = [...entries].sort((a, b) => b.leaguePoints - a.leaguePoints);
    for (const entry of sortedByLpDesc) {
      if (seen.has(entry.puuid)) continue;
      seen.add(entry.puuid);
      ordered.push(entry.puuid);
    }
  }

  return ordered;
}
