// src/pipeline/aggregate/items.ts
// F2: 아이템 채택률(완성템 6슬롯) 집계. 순수 함수 — 부수효과 없음.
// 완성템 필터(ST-08 Data Dragon 매핑 단계 몫)는 여기서 하지 않는다 — items[0..5](6슬롯)에 등장한
// 모든 아이템(itemId=0 제외)을 그대로 집계한다.

import type { ItemStat, MatchSlim, PatchId } from "../types";
import { wilsonInterval } from "./stats";

const ITEM_SLOT_COUNT = 6; // item0..item5 (item6=장신구는 제외)

/**
 * MatchSlim[] → 아이템 단위 채택률 집계. 한 참가자가 같은 아이템을 여러 슬롯에 들고 있어도
 * 참가자 단위로는 1회만 카운트한다(Set 중복 제거). 정렬: adoptionRate 내림차순, 동률은 itemId
 * 오름차순으로 결정론을 보장한다.
 */
export function aggregateItems(matches: MatchSlim[], patch: PatchId): ItemStat[] {
  const holderCounts = new Map<number, number>();
  let totalParticipants = 0;

  for (const match of matches) {
    for (const participant of match.participants) {
      totalParticipants += 1;
      const heldItems = new Set(
        participant.items.slice(0, ITEM_SLOT_COUNT).filter((itemId) => itemId > 0)
      );
      for (const itemId of heldItems) {
        holderCounts.set(itemId, (holderCounts.get(itemId) ?? 0) + 1);
      }
    }
  }

  const rows: ItemStat[] = [];
  for (const [itemId, n] of holderCounts) {
    const adoptionRate = totalParticipants === 0 ? 0 : n / totalParticipants;
    rows.push({
      itemId,
      patch,
      n,
      totalParticipants,
      adoptionRate,
      ci: wilsonInterval(n, totalParticipants),
    });
  }

  rows.sort((a, b) => b.adoptionRate - a.adoptionRate || a.itemId - b.itemId);
  return rows;
}
