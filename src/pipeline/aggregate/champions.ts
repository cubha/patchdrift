// src/pipeline/aggregate/champions.ts
// F2: 챔피언 픽률·밴률·승률(포지션별) 집계.
// TODO(F2): MatchSlim[] → ChampionStat[] 리듀스 구현 (Wilson CI는 stats.ts 위임)

import type { ChampionStat, MatchSlim, PatchId } from "../types";

export function aggregateChampionStats(matches: MatchSlim[], patch: PatchId): ChampionStat[] {
  throw new Error(
    `TODO(F2): aggregateChampionStats(n=${matches.length}, patch=${patch}) not implemented`
  );
}
