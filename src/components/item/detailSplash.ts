// src/components/item/detailSplash.ts
// 항목상세 앰비언트 스플래시 URL — 챔피언 항목(entityType==="champion")에서만 그 챔피언의
// DDragon 스플래시를 쓴다. 아이템·라인·오브젝트 항목은 스플래시 자산이 없으므로 null(배경은
// AmbientBackground.tsx가 항상 렌더하는 지형 레이어만 보인다). 자산은 scripts/run-ddragon.ts가
// 집계에 등장한 챔피언 전원분을 public/dd/splash/{championId}_0.jpg로 미리 받아 둔다(정적
// export라 런타임 fetch 불가).

import type { DeltaRecord } from "@/pipeline/types";

export function championSplashUrl(delta: Pick<DeltaRecord, "entityType" | "entityKey">): string | null {
  return delta.entityType === "champion" ? `/dd/splash/${delta.entityKey}_0.jpg` : null;
}
