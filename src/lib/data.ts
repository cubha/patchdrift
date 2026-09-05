// src/lib/data.ts
// 빌드 타임 JSON 로더 — data/aggregated/*.json을 읽어 정적 페이지에 임베드한다(런타임 외부 API 0,
// SCOPE §2 F7 "사전 인덱싱" 원칙). fs 읽기는 이후 SubTask에서 구현한다.
// TODO: data/aggregated 파일 스키마 확정 후 fs 읽기 구현

import type { ChampionStat, DeltaRecord, ItemStat, ObjectiveStat, PatchId } from "@/pipeline/types";

export interface AggregatedPatchData {
  patch: PatchId;
  champions: ChampionStat[];
  items: ItemStat[];
  objectives: ObjectiveStat[];
}

export function loadAggregated(patch: PatchId): AggregatedPatchData {
  throw new Error(`TODO: loadAggregated(${patch}) not implemented`);
}

export function loadDeltas(from: PatchId, to: PatchId): DeltaRecord[] {
  throw new Error(`TODO: loadDeltas(${from}→${to}) not implemented`);
}
