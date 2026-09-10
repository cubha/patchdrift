// src/components/home/heroSplash.ts
// 히어로 앰비언트(HeroAmbient.splashUrl) 대표 챔피언 선정 — 순수 함수. HANDOFF §5 "전량 아님 —
// 패치 대표 챔피언 1~2장만" 스코프 결정에 따라 1건만 고른다. 선정 기준: 챔피언 scope=all
// (3세그먼트 id — lib/lane.ts parseLaneAxis와 동일 규약) 행 중 표본 게이트를 통과한
// (status !== "insufficient-sample") |delta| 최댓값 1건. 라인/오브젝트/summary 행은 챔피언
// 자산이 없으므로 제외, position-scope(4세그먼트) 행은 "패치 대표"로 보기엔 좁은 표본이라 제외.

import type { DeltaRecord } from "@/pipeline/types";
import { parseLaneAxis } from "@/lib/lane";

export function resolveHeroSplashEntityKey(rows: readonly DeltaRecord[]): string | null {
  let best: DeltaRecord | null = null;
  for (const row of rows) {
    if (row.entityType !== "champion") continue;
    if (row.status === "insufficient-sample") continue;
    if (row.delta === null) continue;
    if (parseLaneAxis(row.id) !== "all") continue;
    if (best === null || Math.abs(row.delta) > Math.abs(best.delta as number)) {
      best = row;
    }
  }
  return best?.entityKey ?? null;
}

/** 대표 챔피언 entityKey → DDragon 스플래시 정적 자산 경로(public/dd/splash/{key}_0.jpg,
 * run-ddragon.ts가 다운로드하는 /dd/champion/*.png와 동일 디렉토리 계약). */
export function heroSplashUrl(entityKey: string | null): string | null {
  return entityKey ? `/dd/splash/${entityKey}_0.jpg` : null;
}
