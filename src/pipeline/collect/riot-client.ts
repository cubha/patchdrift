// src/pipeline/collect/riot-client.ts
// Riot API 클라이언트 — fetch + bottleneck 2단 체이닝(20/1s ⟵ 100/120s), 429 Retry-After 재시도.
// TODO(F1): bottleneck Group 체이닝 구성 + 실제 fetch 구현. SCOPE §3 "Riot API 클라이언트" 근거.

import type { MatchSlim, PatchId } from "../types";

export interface RiotClientOptions {
  apiKey: string;
  region: string;
}

export interface RiotClient {
  fetchChallengerPuuids(): Promise<string[]>;
  fetchMatchIdsByPuuid(puuid: string, patchFrom: PatchId): Promise<string[]>;
  fetchMatchDetail(matchId: string): Promise<MatchSlim>;
}

export function createRiotClient(options: RiotClientOptions): RiotClient {
  throw new Error(`TODO(F1): createRiotClient(region=${options.region}) not implemented`);
}
