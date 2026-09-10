// src/components/item/storedCi.ts
// DeltaRecord → chartData.ts의 buildChartData 5번째 인자(StoredCi) 조회 — champions.json/
// items.json에서 그 델타의 before/after 패치 자신의 Wilson CI를 찾는다(ST-E VERIFY-SPEC
// "page.tsx에서 loadChampions/loadItems로 조회해 5번째 인자로 넘겨야 한다"의 구현).
// 순수 함수(이미 로드된 rows 배열 + ddragon 인덱스를 받는다) — fs I/O는 호출부(item/page.tsx)
// 책임이라 이 파일 자체는 테스트하기 쉽다.
//
// metric→저장 CI 매핑(ST-E 확정): pickRate→ci.pick · banRate→ci.ban(scope!=="all"이면 항상
// null) · winRate→ci.win(n 게이트 미달 시 null) · adoptionRate→ItemStat.ci. 그 외 metric
// (goldAt10/goldAt14/firstSec/avgDurationSec)은 저장 CI 자체가 없어 undefined를 반환하고,
// buildChartData가 기존 델타-CI 폴백으로 떨어진다.

import type { ChampionStat, DeltaRecord, Interval, ItemStat } from "@/pipeline/types";
import type { DdragonData } from "@/pipeline/match/ddragon";
import { parseLaneAxis } from "@/lib/lane";
import type { StoredCi } from "./chartData";

/** `scope`를 함께 받아 banRate를 scope="all"에서만 읽는다 — `aggregate/champions.ts`가 애초에
 * `ci.ban`을 scope!=="all"일 때 null로 산출하므로(및 delta.ts가 position-scope 델타를 pickRate/
 * winRate로만 만들어 banRate가 position 행과 짝지어질 일이 현재는 없으므로) 오늘은 도달 불가한
 * 분기지만, ST-E VERIFY-SPEC이 명시한 불변식("scope!=='all'이면 항상 null")을 코드로도 강제해
 * 향후 delta.ts가 바뀌어도 조용히 어긋난 CI를 반환하지 않게 한다(scope-critic 2026-09-10 지적). */
function championCiFor(row: ChampionStat, metric: string, scope: ChampionStat["scope"]): Interval | null {
  if (metric === "pickRate") return row.ci.pick;
  if (metric === "banRate") return scope === "all" ? row.ci.ban : null;
  if (metric === "winRate") return row.ci.win;
  return null;
}

/**
 * `delta`의 entityType/metric이 저장 CI 대상(챔피언 pick/ban/win·아이템 adoptionRate)이 아니면
 * `undefined`(호출부는 5번째 인자를 생략한 것과 동일하게 취급 — buildChartData가 델타-CI로
 * 폴백). 대상이면 `{before, after}`를 반환하되 행을 못 찾거나 게이트 미달(ci.win===null 등)인
 * 쪽은 `null`로 채운다 — buildChartData가 이미 그 경우 폴백 처리를 하므로 여기서 추가 판단
 * 로직을 두지 않는다(중복 방지).
 */
export function resolveStoredCi(
  delta: Pick<DeltaRecord, "id" | "entityType" | "entityKey" | "metric">,
  ddragon: DdragonData,
  championsBefore: readonly ChampionStat[] | null,
  championsAfter: readonly ChampionStat[] | null,
  itemsBefore: readonly ItemStat[] | null,
  itemsAfter: readonly ItemStat[] | null
): StoredCi | undefined {
  if (delta.entityType === "champion" && ["pickRate", "banRate", "winRate"].includes(delta.metric)) {
    const championId = ddragon.champions.byId(delta.entityKey)?.key;
    if (championId === undefined) return undefined;

    const laneAxis = parseLaneAxis(delta.id);
    if (laneAxis === null) return undefined;
    const scope: ChampionStat["scope"] = laneAxis === "all" ? "all" : "position";
    const position = laneAxis === "all" ? "" : laneAxis;

    const beforeRow = championsBefore?.find(
      (r) => r.championId === championId && r.scope === scope && r.position === position
    );
    const afterRow = championsAfter?.find(
      (r) => r.championId === championId && r.scope === scope && r.position === position
    );
    return {
      before: beforeRow ? championCiFor(beforeRow, delta.metric, scope) : null,
      after: afterRow ? championCiFor(afterRow, delta.metric, scope) : null,
    };
  }

  if (delta.entityType === "item" && delta.metric === "adoptionRate") {
    const itemId = Number(delta.entityKey);
    const beforeRow = itemsBefore?.find((r) => r.itemId === itemId);
    const afterRow = itemsAfter?.find((r) => r.itemId === itemId);
    return {
      before: beforeRow?.ci ?? null,
      after: afterRow?.ci ?? null,
    };
  }

  return undefined;
}
