// src/pipeline/collect/seed.ts
// 시드 파이프라인: KR 챌린저/GM/마스터 → puuid → 매치ID(startTime 필터).
// TODO(F1): riot-client 구현 후 시드 로직 연결

import type { PatchId } from "../types";

export interface SeedResult {
  puuids: string[];
  matchIds: string[];
}

export async function seedMatchIds(patch: PatchId): Promise<SeedResult> {
  throw new Error(`TODO(F1): seedMatchIds(${patch}) not implemented`);
}
