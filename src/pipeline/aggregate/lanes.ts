// src/pipeline/aggregate/lanes.ts
// F8: 라인별 골드@10/@14 집계(타임라인 표본 기반). 순수 함수 — 부수효과 없음.
// 기존 스텁의 `classifyLane`/`Lane`은 ST-06 설계(TimelineSlim 기반 집계)와 무관하고 저장소 내
// 다른 어떤 파일도 참조하지 않아(grep 확인 완료) 폐기하고 이 파일을 전면 교체한다.

import type { LaneGoldStat, LanePosition, PatchId, TimelineSlim } from "../types";
import { summarize } from "./stats";

const LANE_POSITIONS: readonly LanePosition[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

/**
 * TimelineSlim[] → 포지션별 10분/14분 골드 평균(팀 구분 없이 참가자 단위) 집계. 값이 없는
 * 항목(null)은 분모에서 제외한다. @10 표본이 0인 포지션은 측정치가 전혀 없다는 뜻이므로 행 자체를
 * 생략한다(가짜 0 값이 ST-08 델타 비교를 오염시키는 것을 방지). `goldAt14Avg`는 non-nullable
 * 타입 제약상 n14=0이어도 값이 있어야 하므로 그 경우 summarize([]).mean(=0)이 그대로 들어간다 —
 * 소비처는 반드시 n14을 먼저 확인해야 한다(LaneGoldStat 주석 참고).
 */
export function aggregateLanes(timelines: TimelineSlim[], patch: PatchId): LaneGoldStat[] {
  const rows: LaneGoldStat[] = [];

  for (const position of LANE_POSITIONS) {
    const at10: number[] = [];
    const at14: number[] = [];

    for (const timeline of timelines) {
      const split = timeline.lanes[position];
      if (!split) continue;
      for (const side of [split.blue, split.red]) {
        if (side.goldAt10 !== null) at10.push(side.goldAt10);
        if (side.goldAt14 !== null) at14.push(side.goldAt14);
      }
    }

    const s10 = summarize(at10);
    if (s10.n === 0) continue;
    const s14 = summarize(at14);

    rows.push({
      patch,
      position,
      n: s10.n,
      goldAt10Avg: s10.mean,
      goldAt10Sd: s10.sd,
      goldAt14Avg: s14.mean,
      goldAt14Sd: s14.sd,
      n14: s14.n,
    });
  }

  return rows;
}
