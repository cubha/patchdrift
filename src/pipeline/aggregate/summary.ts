// src/pipeline/aggregate/summary.ts
// F2/F8: 패치 단위 요약(브리핑 홈 카드용). 순수 함수 — 부수효과 없음.

import type { MatchSlim, PatchId, PatchSummary, TimelineSlim } from "../types";
import { summarize } from "./stats";

function averageFirstObjective(
  timelines: readonly TimelineSlim[],
  pick: (t: TimelineSlim) => number | null
): number | null {
  const values = timelines.map(pick).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return summarize(values).mean;
}

/**
 * MatchSlim[] + TimelineSlim[] → 패치 단위 요약. `avgDurationSec`은 matches.jsonl(상세 수집)
 * 기반, `firstXSecAvg`는 timelines.jsonl(타임라인 표본) 기반 — 표본 크기가 서로 다를 수 있다
 * (F8 설계상 타임라인은 상세 수집의 부분표본).
 */
export function summarizePatch(
  matches: MatchSlim[],
  timelines: TimelineSlim[],
  patch: PatchId
): PatchSummary {
  const durationStats = summarize(matches.map((m) => m.gameDurationSec));

  const queueDistribution: Record<number, number> = {};
  for (const match of matches) {
    queueDistribution[match.queueId] = (queueDistribution[match.queueId] ?? 0) + 1;
  }

  let gameCreationMsRange: { min: number; max: number } | null = null;
  for (const match of matches) {
    if (!gameCreationMsRange) {
      gameCreationMsRange = { min: match.gameCreationMs, max: match.gameCreationMs };
      continue;
    }
    if (match.gameCreationMs < gameCreationMsRange.min) gameCreationMsRange.min = match.gameCreationMs;
    if (match.gameCreationMs > gameCreationMsRange.max) gameCreationMsRange.max = match.gameCreationMs;
  }

  return {
    patch,
    matches: matches.length,
    avgDurationSec: durationStats.mean,
    avgDurationSecSd: durationStats.sd,
    firstDragonSecAvg: averageFirstObjective(timelines, (t) => t.firstObjectives.dragonSec),
    firstHeraldSecAvg: averageFirstObjective(timelines, (t) => t.firstObjectives.heraldSec),
    firstBaronSecAvg: averageFirstObjective(timelines, (t) => t.firstObjectives.baronSec),
    firstTowerSecAvg: averageFirstObjective(timelines, (t) => t.firstObjectives.towerSec),
    queueDistribution,
    gameCreationMsRange,
    timelineSamples: timelines.length,
  };
}
