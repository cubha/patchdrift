// src/pipeline/match/llm-match.ts
// F4 2단(LLM): Claude Sonnet 5로 짝 없는 델타의 간접 영향 후보를 추론한다. 반환된 후보 ID는
// 반드시 검증(verified)한 뒤에만 유색 링크로 노출한다 — 무근거 문장은 회색(verdict.ts 참고).
// 배치 1회 상한·캐시 우선·예산 소진 시 캐시 폴백(SCOP §3 "LLM 짝짓기·요약" 채택 근거).
// 런타임 외부 API 호출은 이 모듈에 한정한다(그 외 파이프라인 모듈은 외부 API 호출 0).
// TODO(F4): @anthropic-ai/sdk 연동, 캐시 파일 스키마 확정

import type { DeltaRecord, PatchNoteItem } from "../types";

export interface LlmMatchCandidate {
  deltaId: string;
  candidateNoteItemIds: string[];
  reasoning: string;
  verified: boolean;
}

export interface LlmMatchOptions {
  maxDeltas: number;
  cacheFile: string;
}

export async function inferIndirectCandidates(
  unmatchedDeltas: DeltaRecord[],
  noteItems: PatchNoteItem[],
  options: LlmMatchOptions
): Promise<LlmMatchCandidate[]> {
  throw new Error(
    `TODO(F4): inferIndirectCandidates(deltas=${unmatchedDeltas.length}, notes=${noteItems.length}, cache=${options.cacheFile}) not implemented`
  );
}
