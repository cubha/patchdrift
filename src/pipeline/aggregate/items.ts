// src/pipeline/aggregate/items.ts
// F2: 아이템 채택률(완성템 6슬롯) 집계.
// TODO(F2): MatchSlim[] → ItemStat[] 리듀스 구현

import type { ItemStat, MatchSlim, PatchId } from "../types";

export function aggregateItemStats(matches: MatchSlim[], patch: PatchId): ItemStat[] {
  throw new Error(
    `TODO(F2): aggregateItemStats(n=${matches.length}, patch=${patch}) not implemented`
  );
}
