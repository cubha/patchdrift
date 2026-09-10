// src/lib/lane.ts
// 델타 레코드 id에서 라인(포지션) 축을 파싱하는 순수 함수. `champion:{key}:{metric}`(3세그먼트,
// scope="all") | `champion:{key}:{pos}:{metric}`(4세그먼트, scope="position") id 네임스페이스
// 규약은 pipeline/types.ts `DeltaRecord.id` 주석 확정본(ST-08)을 그대로 전제한다 —
// components/home/logic.ts의 `isAllScopeChampionRow`(세그먼트 수로 all/position만 구분)와 동일한
// 전제를 공유하되, 이 함수는 한 단계 더 나아가 실제 포지션 문자열까지 추출한다.

import type { DeltaRecord, LanePosition } from "@/pipeline/types";

/** 델타 id에서 도출 가능한 "라인 축" 값 — 5개 명명 포지션 + 전체(scope=all) 행. */
export type LaneAxis = LanePosition | "all";

const LANE_POSITIONS: readonly LanePosition[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

function isLanePosition(value: string): value is LanePosition {
  return (LANE_POSITIONS as readonly string[]).includes(value);
}

/**
 * 챔피언 델타 id에서 라인 축을 파싱한다.
 * - 3세그먼트(`champion:{key}:{metric}`) → `"all"`(scope=all 행).
 * - 4세그먼트(`champion:{key}:{pos}:{metric}`)이고 3번째 세그먼트가 유효한 `LanePosition`이면
 *   그 포지션 값.
 * - 그 외(entityType이 `"champion"`이 아님 / 세그먼트 수가 3·4가 아님 / 4세그먼트인데 포지션
 *   세그먼트가 유효하지 않음)는 전부 `null`(조용히 폴백하지 않고 파싱 실패를 명시한다).
 */
export function parseLaneAxis(id: string): LaneAxis | null {
  const segments = id.split(":");
  if (segments[0] !== "champion") return null;
  if (segments.length === 3) return "all";
  if (segments.length === 4) {
    const pos = segments[2];
    return isLanePosition(pos) ? pos : null;
  }
  return null;
}

/**
 * 주어진 `entityKey`가 가진 라인별(scope=position) 델타 행에서 실제 라인 집합을 도출한다 —
 * 홈 릴리즈노트 스트림의 라인 필터(HANDOFF-redesign-2026-09-10.md §4-1 "라인 필터 6종")가
 * 쓴다. 노트 항목 자체에는 라인 정보가 없으므로(ST-B releaseStream.ts는 entity 한글명만
 * 안다) 그 엔티티의 position-scope 델타 행에서 라인을 역산한다.
 * - scope=all 행(`parseLaneAxis`가 `"all"`을 반환)은 라인 정보가 아니므로 결과에 포함하지 않는다.
 * - 이 엔티티에 position-scope 델타 행이 하나도 없으면 빈 배열 — 호출부는 이를 "라인 필터 중
 *   '전체'에서만 노출"로 취급한다(라인을 추측해 채우지 않는다).
 */
export function lanesForEntityKey(
  records: readonly Pick<DeltaRecord, "id" | "entityKey">[],
  entityKey: string
): LanePosition[] {
  const lanes = new Set<LanePosition>();
  for (const record of records) {
    if (record.entityKey !== entityKey) continue;
    const lane = parseLaneAxis(record.id);
    if (lane !== null && lane !== "all") lanes.add(lane);
  }
  return LANE_POSITIONS.filter((lane) => lanes.has(lane));
}
