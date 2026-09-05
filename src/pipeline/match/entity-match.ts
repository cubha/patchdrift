// src/pipeline/match/entity-match.ts
// F4 1단(결정론): 엔티티 ID 블로킹 + 방향 정합 스코어로 패치노트 항목 ↔ 델타 짝짓기.
// TODO(F4): 블로킹 키(엔티티 ID) + 방향(direction) 정합 스코어링 구현

import type { DeltaRecord, PatchNoteItem } from "../types";

export interface EntityMatchResult {
  matched: Array<{ noteItemId: string; deltaId: string; score: number }>;
  unmatchedDeltas: DeltaRecord[];
}

export function matchDeterministic(
  noteItems: PatchNoteItem[],
  deltas: DeltaRecord[]
): EntityMatchResult {
  throw new Error(
    `TODO(F4): matchDeterministic(notes=${noteItems.length}, deltas=${deltas.length}) not implemented`
  );
}
