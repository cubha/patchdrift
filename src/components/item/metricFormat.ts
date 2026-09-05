// src/components/item/metricFormat.ts
// 항목 상세(ST-12) 전용 지표 표시 헬퍼 — src/lib/format.ts(다른 SubTask 소유, 편집 금지)가
// 커버하지 못하는 "firstSec"(오브젝트 첫 획득 시각, src/pipeline/match/delta.ts 확정 metric
// 이름 — entityName에 이미 "용"/"전령"/"바론"/"포탑"이 들어있고 metricLabel엔 이 키가 없다)
// 표시와, DeltaRecord.metric → DeltaValue/차트가 쓰는 단위 종류(kind) 매핑을 이 파일에 모은다.
// 순수 함수만 — 부수효과 없음(테스트 대상).

import type { DeltaRecord } from "@/pipeline/types";
import { fmtInt, fmtPct, fmtSec, metricLabel } from "@/lib/format";

/** DeltaValue/차트가 구분하는 값의 단위 종류. */
export type MetricKind = "pp" | "sec" | "gold";

const PP_METRICS = new Set(["pickRate", "banRate", "winRate", "adoptionRate"]);
const SEC_METRICS = new Set(["firstSec", "avgDurationSec"]);
const GOLD_METRICS = new Set(["goldAt10", "goldAt14"]);

/**
 * DeltaRecord.metric 문자열 → 단위 종류. 알려지지 않은 metric은 "gold"(원시 정수 표시)로
 * 안전하게 떨어진다 — 비율로 오인해 ×100 스케일링하는 것보다 원시값을 그대로 보여주는 쪽이
 * 덜 위험하다는 판단(무근거 문장 회색 원칙과 동일하게, 모르면 가장 덜 왜곡된 표시를 택한다).
 */
export function metricKind(metric: string): MetricKind {
  if (PP_METRICS.has(metric)) return "pp";
  if (SEC_METRICS.has(metric)) return "sec";
  if (GOLD_METRICS.has(metric)) return "gold";
  return "gold";
}

/** value(원시 단위: 비율 0~1 / 초 / 골드)를 kind에 맞는 사람이 읽는 문자열로. null은 "—". */
export function formatMetricValue(value: number | null, kind: MetricKind): string {
  if (value === null) return "—";
  if (kind === "pp") return fmtPct(value);
  if (kind === "sec") return fmtSec(value);
  return fmtInt(value);
}

/**
 * 델타의 사람이 읽는 지표 라벨. `format.ts`의 `metricLabel`이 커버하지 못하는 "firstSec"만
 * 여기서 `entityName`(오브젝트 한글명)과 조합해 만든다 — 그 외 metric은 그대로 위임한다.
 */
export function displayMetricLabel(delta: Pick<DeltaRecord, "metric" | "entityName">): string {
  if (delta.metric === "firstSec") {
    return `첫 ${delta.entityName} 시각`;
  }
  return metricLabel(delta.metric);
}
