// src/pipeline/match/verdict.ts
// F4: entity-match(1단) + llm-match(2단) 결과를 병합해 최종 판정(MatchStatus)을 산출한다.
// 모든 판정문은 원천 링크를 가져야 하며, 근거 없는 판정은 verdict.reasoning=null·sourceUrl=null로
// 남겨 프론트가 회색(--muted) 처리하게 한다. 산출물은 deltas/{from}_{to}.json에 기록된다.
// TODO(F4): 병합 로직 구현

import type { DeltaRecord } from "../types";

export interface VerdictInput {
  patchFrom: string;
  patchTo: string;
}

export function buildDeltaRecords(input: VerdictInput): DeltaRecord[] {
  throw new Error(
    `TODO(F4): buildDeltaRecords(${input.patchFrom}→${input.patchTo}) not implemented`
  );
}
