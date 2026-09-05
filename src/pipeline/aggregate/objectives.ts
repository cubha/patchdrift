// src/pipeline/aggregate/objectives.ts
// F8: 라인별 골드@10/@14, 첫 오브젝트(용·전령·바론·포탑) 시각 델타 집계.
// TODO(F8): 타임라인 표본(collect/timeline.ts) → ObjectiveStat[] 리듀스 구현

import type { ObjectiveStat, PatchId } from "../types";

export function aggregateObjectiveStats(
  timelineSampleFile: string,
  patch: PatchId
): ObjectiveStat[] {
  throw new Error(
    `TODO(F8): aggregateObjectiveStats(${timelineSampleFile}, patch=${patch}) not implemented`
  );
}
