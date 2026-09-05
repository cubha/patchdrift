// src/pipeline/aggregate/lanes.ts
// 포지션/라인 분류 유틸 — champions.ts·objectives.ts 공통 사용.
// TODO(F2/F8): Riot teamPosition 값 → 표준 라인 라벨 매핑 구현

export type Lane = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT" | "UNKNOWN";

export function classifyLane(teamPosition: string): Lane {
  throw new Error(`TODO(F2): classifyLane(${teamPosition}) not implemented`);
}
