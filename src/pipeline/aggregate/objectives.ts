// src/pipeline/aggregate/objectives.ts
// F8: 첫 오브젝트(용·전령·바론·포탑) 획득 시각 집계(타임라인 표본 기반). 순수 함수 — 부수효과 없음.

import type { ObjectiveMetricDetail, ObjectiveStat, PatchId, TimelineSlim } from "../types";
import { summarize } from "./stats";

function summarizeMetric(values: ReadonlyArray<number | null>): ObjectiveMetricDetail {
  const present = values.filter((v): v is number => v !== null);
  const { n, mean, sd } = summarize(present);
  return {
    n,
    mean: n === 0 ? null : mean,
    sd,
    occurrenceRate: values.length === 0 ? 0 : present.length / values.length,
  };
}

/**
 * TimelineSlim[] → 첫 용/전령/바론/포탑 획득 시각(초) 집계. 해당 이벤트가 없던 매치(null)는
 * 평균·sd 계산에서 제외하되 occurrenceRate 분모에는 포함한다. `n`(ObjectiveStat 계약 필드)은
 * 오브젝트 종류와 무관한 공통 표본 수 — 즉 `timelines.length`.
 */
export function aggregateObjectives(timelines: TimelineSlim[], patch: PatchId): ObjectiveStat {
  const dragon = summarizeMetric(timelines.map((t) => t.firstObjectives.dragonSec));
  const herald = summarizeMetric(timelines.map((t) => t.firstObjectives.heraldSec));
  const baron = summarizeMetric(timelines.map((t) => t.firstObjectives.baronSec));
  const tower = summarizeMetric(timelines.map((t) => t.firstObjectives.towerSec));

  return {
    patch,
    n: timelines.length,
    firstDragonSecAvg: dragon.mean,
    firstHeraldSecAvg: herald.mean,
    firstBaronSecAvg: baron.mean,
    firstTowerSecAvg: tower.mean,
    dragon,
    herald,
    baron,
    tower,
  };
}
